// ─── Procedure mode toggle ────────────────────────────────────────────────────
function handleSpecialtyChange(val) {
  const isProcedure = val === 'Procedure';
  document.querySelectorAll('.anesthetic-field').forEach(el => {
    el.style.display = isProcedure ? 'none' : '';
  });
  document.querySelectorAll('.procedure-field').forEach(el => {
    el.style.display = isProcedure ? '' : 'none';
  });
}
window.handleSpecialtyChange = handleSpecialtyChange;

// ─── State ────────────────────────────────────────────────────────────────────
let allCases = [];
let currentCaseId = null;
let dbReady = false;
let currentSearchQuery = '';

// ─── Highlight utility ────────────────────────────────────────────────────────
function highlight(str) {
  if (!currentSearchQuery || !str) return escHtml(str || '');
  const words = currentSearchQuery.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return escHtml(str);
  const pattern = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const checkRegex = new RegExp(`^(?:${pattern})$`, 'i');
  const parts = str.split(regex);
  return parts.map(part => checkRegex.test(part) ? `<mark>${escHtml(part)}</mark>` : escHtml(part)).join('');
}

// ─── Firebase ready callback (called by firebase.js after init) ───────────────
window.onCasesDBReady = function () {
  dbReady = true;
  route();
};

// ─── Routing ─────────────────────────────────────────────────────────────────
function route() {
  const hash = location.hash.replace('#', '') || 'logbook';
  if (hash === 'logbook' || hash === '') { currentSearchQuery = ''; showLogbook(); }
  else if (hash === 'new') showForm(null);
  else if (hash.startsWith('edit/')) showForm(hash.replace('edit/', ''));
  else if (hash.startsWith('case/')) showDetail(hash.replace('case/', ''));
  else { currentSearchQuery = ''; showLogbook(); }
}

window.addEventListener('hashchange', route);

window.addEventListener('DOMContentLoaded', function () {
  if (dbReady) route();
});

function navigate(hash) {
  location.hash = hash;
}
window.navigate = navigate;

// ─── View switcher ────────────────────────────────────────────────────────────
function showView(name) {
  document.getElementById('view-logbook').style.display = name === 'logbook' ? 'block' : 'none';
  document.getElementById('view-form').style.display    = name === 'form'    ? 'block' : 'none';
  document.getElementById('view-detail').style.display  = name === 'detail'  ? 'block' : 'none';
  document.getElementById('tab-logbook').classList.toggle('active', name === 'logbook');
  document.getElementById('tab-new').classList.toggle('active', name === 'form');
}

// ─── Logbook ─────────────────────────────────────────────────────────────────
async function showLogbook() {
  showView('logbook');
  document.getElementById('search-input').value = '';

  if (!dbReady) {
    document.getElementById('cases-list').innerHTML = '<div class="loading">Connecting…</div>';
    return;
  }

  document.getElementById('cases-list').innerHTML = '<div class="loading">Loading cases…</div>';

  try {
    const snapshot = await window.casesDB.getAll();
    allCases = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCases(allCases);
  } catch (e) {
    console.error(e);
    document.getElementById('cases-list').innerHTML =
      '<div class="empty-state">Could not load cases. Check your connection.</div>';
  }
}

function renderCases(cases) {
  const el = document.getElementById('cases-list');

  if (cases.length === 0) {
    el.innerHTML = '<div class="empty-state">No cases found. <a href="#new">Log your first case →</a></div>';
    return;
  }

  // Group by specialty, sorted alphabetically; blank specialty goes last
  const groups = {};
  cases.forEach(c => {
    const key = c.specialty || '—';
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === '—') return 1;
    if (b === '—') return -1;
    return a.localeCompare(b);
  });

  // Within each group, sort alphabetically by procedure name
  sortedKeys.forEach(k => {
    groups[k].sort((a, b) => (a.procedureName || '').localeCompare(b.procedureName || ''));
  });

  const totalLabel = currentSearchQuery
    ? `${cases.length} result${cases.length !== 1 ? 's' : ''} for "${escHtml(currentSearchQuery)}"`
    : `${cases.length} case${cases.length !== 1 ? 's' : ''}`;

  el.innerHTML = `<div class="cases-count">${totalLabel}</div>` + sortedKeys.map(specialty => {
    const cards = groups[specialty].map(c => {
      const previewText = c.specialty === 'Procedure' ? c.procedureNotes : c.keyConsiderations;
      const considerations = previewText
        ? (previewText.length > 110 ? previewText.slice(0, 110) + '…' : previewText)
        : '';

      return `
        <div class="case-card" onclick="navigate('case/${c.id}')">
          <div class="card-top">
            ${c.anestheticType ? `<span class="badge">${escHtml(c.anestheticType)}</span>` : ''}
            ${c.specialty === 'Procedure' ? `<span class="badge-procedure">Procedure</span>` : ''}
          </div>
          <div class="card-procedure">${escHtml(c.procedureName || 'Untitled case')}</div>
          ${considerations ? `<div class="card-considerations">${escHtml(considerations)}</div>` : ''}
        </div>
      `;
    }).join('');

    return `<div class="specialty-group">
      <div class="specialty-header">${escHtml(specialty)}</div>
      ${cards}
    </div>`;
  }).join('');
}

function filterCases(query) {
  currentSearchQuery = query.trim();
  if (!currentSearchQuery) {
    renderCases(allCases);
    return;
  }
  const words = currentSearchQuery.toLowerCase().split(/\s+/).filter(Boolean);
  const allText = c => Object.values(c).filter(v => typeof v === 'string').join(' ').toLowerCase();
  const filtered = allCases.filter(c => {
    const text = allText(c);
    return words.every(w => text.includes(w));
  });
  renderCases(filtered);
}
window.filterCases = filterCases;

// ─── Form ─────────────────────────────────────────────────────────────────────
function showForm(caseId) {
  showView('form');
  currentCaseId = caseId || null;

  const submitBtn = document.getElementById('form-submit-btn');
  const deleteBtn = document.getElementById('delete-btn');
  const title     = document.getElementById('form-title');

  if (caseId) {
    title.textContent        = 'Edit Case';
    submitBtn.textContent    = 'Save Changes';
    deleteBtn.style.display  = 'inline-block';
    loadFormData(caseId);
  } else {
    title.textContent        = 'New Case';
    submitBtn.textContent    = 'Save Case';
    deleteBtn.style.display  = 'none';
    resetForm();
  }
}

function resetForm() {
  document.getElementById('case-form').reset();
  handleSpecialtyChange('');
  const btn = document.getElementById('form-submit-btn');
  btn.disabled = false;
  btn.textContent = 'Save Case';
}

async function loadFormData(caseId) {
  try {
    const snap = await window.casesDB.getOne(caseId);
    if (!snap.exists()) return;
    const c = snap.data();
    setField('f-specialty',       c.specialty);
    setField('f-procedure',       c.procedureName);
    setField('f-anesthetic-type', c.anestheticType);
    setField('f-airway',          c.airway);
    setField('f-drugs',           c.drugs);
    setField('f-considerations',  c.keyConsiderations);
    setField('f-complications',   c.complications);
    setField('f-notes',           c.notes);
    setField('f-procedure-notes', c.procedureNotes);
    handleSpecialtyChange(c.specialty || '');
  } catch (e) {
    console.error('Failed to load case for editing:', e);
  }
}

function setField(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) el.value = value;
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('form-submit-btn');
  btn.disabled    = true;
  btn.textContent = 'Saving…';

  const specialty = document.getElementById('f-specialty').value;
  const isProcedure = specialty === 'Procedure';
  const data = {
    specialty:         specialty,
    procedureName:     document.getElementById('f-procedure').value,
    anestheticType:    isProcedure ? '' : document.getElementById('f-anesthetic-type').value,
    airway:            isProcedure ? '' : document.getElementById('f-airway').value,
    drugs:             isProcedure ? '' : document.getElementById('f-drugs').value,
    keyConsiderations: isProcedure ? '' : document.getElementById('f-considerations').value,
    complications:     isProcedure ? '' : document.getElementById('f-complications').value,
    notes:             isProcedure ? '' : document.getElementById('f-notes').value,
    procedureNotes:    isProcedure ? document.getElementById('f-procedure-notes').value : '',
  };

  try {
    if (currentCaseId) {
      await window.casesDB.update(currentCaseId, data);
    } else {
      await window.casesDB.add(data);
    }
    btn.disabled = false;
    btn.textContent = currentCaseId ? 'Save Changes' : 'Save Case';
    navigate('logbook');
  } catch (e) {
    console.error('Save failed:', e);
    btn.disabled    = false;
    btn.textContent = currentCaseId ? 'Save Changes' : 'Save Case';
    alert('Could not save. Check your connection and try again.');
  }
}
window.handleFormSubmit = handleFormSubmit;

async function deleteCaseFromForm() {
  if (!currentCaseId) return;
  if (!confirm('Delete this case? This cannot be undone.')) return;
  try {
    await window.casesDB.remove(currentCaseId);
    currentCaseId = null;
    navigate('logbook');
  } catch (e) {
    console.error('Delete failed:', e);
    alert('Could not delete case.');
  }
}
window.deleteCaseFromForm = deleteCaseFromForm;

// ─── Detail ───────────────────────────────────────────────────────────────────
async function showDetail(caseId) {
  showView('detail');
  currentCaseId = caseId;

  const el = document.getElementById('case-detail-content');
  el.innerHTML = '<div class="loading">Loading…</div>';

  try {
    const snap = await window.casesDB.getOne(caseId);
    if (!snap.exists()) {
      el.innerHTML = '<div class="empty-state">Case not found.</div>';
      return;
    }
    renderDetail(snap.data());
  } catch (e) {
    console.error(e);
    el.innerHTML = '<div class="empty-state">Could not load case.</div>';
  }
}

function renderDetail(c) {
  const el = document.getElementById('case-detail-content');

  const field = (label, value) => {
    if (!value) return '';
    if (!label) return `<div class="detail-field"><span class="detail-value">${highlight(value)}</span></div>`;
    return `
      <div class="detail-field">
        <span class="detail-label">${escHtml(label)}</span>
        <span class="detail-value">${highlight(value)}</span>
      </div>`;
  };

  const section = (title, content) => {
    if (!content.trim()) return '';
    return `<div class="detail-section"><h3>${title}</h3>${content}</div>`;
  };

  el.innerHTML = `
    <div class="detail-header">
      <div class="detail-procedure">${highlight(c.procedureName || 'Untitled case')}</div>
      <div class="detail-badges">
        ${c.specialty      ? `<span class="badge-lg">${escHtml(c.specialty)}</span>`      : ''}
        ${c.anestheticType ? `<span class="badge">${escHtml(c.anestheticType)}</span>`    : ''}
        ${c.specialty === 'Procedure' ? `<span class="badge-procedure">Procedure</span>` : ''}
      </div>
    </div>

    ${c.specialty === 'Procedure'
      ? (c.procedureNotes ? `<div class="detail-section"><div class="procedure-text">${highlight(c.procedureNotes)}</div></div>` : '')
      : `
        ${c.airway ? `<div class="detail-section detail-mono"><h3>Airway</h3>${field('', c.airway)}</div>` : ''}
        ${c.drugs  ? `<div class="detail-section detail-mono"><h3>Drugs</h3>${field('', c.drugs)}</div>`  : ''}
        ${section('Notes',
          field('Key Considerations',             c.keyConsiderations) +
          field('Complications / Notable Events', c.complications) +
          field('Notes',                          c.notes)
        )}
      `
    }
  `;
}

function editCurrentCase() {
  if (currentCaseId) navigate(`edit/${currentCaseId}`);
}
window.editCurrentCase = editCurrentCase;

async function deleteCaseFromDetail() {
  if (!currentCaseId) return;
  if (!confirm('Delete this case? This cannot be undone.')) return;
  try {
    await window.casesDB.remove(currentCaseId);
    currentCaseId = null;
    navigate('logbook');
  } catch (e) {
    console.error('Delete failed:', e);
    alert('Could not delete case.');
  }
}
window.deleteCaseFromDetail = deleteCaseFromDetail;

// ─── Utilities ────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
