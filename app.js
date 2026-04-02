/* ============================================================
   Seattle Home Windows — Glass Order Management App
   ============================================================ */

const GHL_TOKEN = 'pit-b117aa50-e8a1-4e6a-a59a-06791072a753';
const GHL_LOCATION = 'yvNhywMU0Z5rVZEuFbNm';
const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_HEADERS = {
  'Authorization': `Bearer ${GHL_TOKEN}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

const PIN = '1234';

const STAGE_MAP = {
  'new lead':         { label: 'New Lead',         cls: 'badge-gray' },
  'quote sent':       { label: 'Quote Sent',       cls: 'badge-blue' },
  'deposit received': { label: 'Deposit Received', cls: 'badge-green' },
  'glass ordered':    { label: 'Glass Ordered',    cls: 'badge-yellow' },
  'glass received':   { label: 'Glass Received',   cls: 'badge-orange' },
  'job scheduled':    { label: 'Job Scheduled',    cls: 'badge-purple' },
  'job complete':     { label: 'Job Complete',     cls: 'badge-green-dark' }
};

const FRACTIONS = ['0', '1/8', '3/16', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8'];

/* ---------- PIN LOGIN ---------- */
document.addEventListener('DOMContentLoaded', () => {
  setupPinInputs();
});

function setupPinInputs() {
  const digits = document.querySelectorAll('.pin-digit');
  if (!digits.length) return;

  digits.forEach((input, i) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val && i < digits.length - 1) digits[i + 1].focus();
      if (val && i === digits.length - 1) attemptLogin();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && i > 0) {
        digits[i - 1].focus();
      }
    });
  });

  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.addEventListener('click', attemptLogin);
}

function attemptLogin() {
  const digits = document.querySelectorAll('.pin-digit');
  const entered = Array.from(digits).map(d => d.value).join('');
  const errEl = document.getElementById('loginError');
  if (entered.length < 4) {
    errEl.textContent = 'Enter 4-digit PIN';
    return;
  }
  if (entered === PIN) {
    localStorage.setItem('shw_auth', 'true');
    document.getElementById('loginScreen').classList.add('hidden');
    // Init page
    if (typeof initJobs === 'function' && document.getElementById('jobList')) initJobs();
    if (typeof initNewOrder === 'function' && document.getElementById('unitsContainer')) initNewOrder();
    if (typeof initWorkOrders === 'function' && document.getElementById('woList')) initWorkOrders();
    // If index page, redirect
    if (!document.getElementById('jobList') && !document.getElementById('unitsContainer') && !document.getElementById('woList')) {
      window.location.href = 'jobs.html';
    }
  } else {
    errEl.textContent = 'Wrong PIN';
    digits.forEach(d => { d.value = ''; });
    digits[0].focus();
  }
}

/* ---------- GHL API ---------- */
async function ghlFetch(endpoint, options = {}) {
  try {
    const resp = await fetch(`${GHL_BASE}${endpoint}`, {
      headers: GHL_HEADERS,
      ...options
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (err) {
    console.error('GHL API error:', err);
    throw err;
  }
}

/* ---------- TOAST ---------- */
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

/* ---------- JOBS PAGE ---------- */
let allJobs = [];

function initJobs() {
  loadJobs();
  const searchInput = document.getElementById('jobSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderJobs(e.target.value.trim().toLowerCase());
    });
  }
}

async function loadJobs() {
  const container = document.getElementById('jobList');
  try {
    const data = await ghlFetch(`/opportunities/search?location_id=${GHL_LOCATION}&limit=50`);
    allJobs = data.opportunities || [];
    localStorage.setItem('shw_jobs_cache', JSON.stringify(allJobs));
    renderJobs();
  } catch (err) {
    // Try cache
    const cached = localStorage.getItem('shw_jobs_cache');
    if (cached) {
      allJobs = JSON.parse(cached);
      renderJobs();
      showToast('Using cached data (offline)');
    } else {
      container.innerHTML = `
        <div class="error-state">
          <div class="error-text">⚠️ Could not load jobs</div>
          <p style="color:var(--gray-500);font-size:.8125rem;margin-top:.5rem;">${err.message}</p>
          <button class="btn btn-primary btn-sm" style="margin-top:1rem;width:auto;" onclick="loadJobs()">Retry</button>
        </div>`;
    }
  }
}

function renderJobs(filter = '') {
  const container = document.getElementById('jobList');
  let jobs = allJobs;
  if (filter) {
    jobs = jobs.filter(j => {
      const name = (j.contact?.name || j.name || '').toLowerCase();
      return name.includes(filter);
    });
  }

  if (!jobs.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-text">${filter ? 'No matching jobs' : 'No jobs found'}</div></div>`;
    return;
  }

  container.innerHTML = jobs.map((j, idx) => {
    const name = j.contact?.name || j.name || 'Unknown';
    const address = j.contact?.address1 || j.customFields?.address || '';
    const stageName = (j.pipelineStageId ? getStageName(j) : j.status || 'unknown').toLowerCase();
    const stageInfo = STAGE_MAP[stageName] || { label: stageName, cls: 'badge-gray' };
    const po = j.customFields?.po_number || j.customFields?.['PO Number'] || '';
    const units = j.customFields?.glass_units || j.customFields?.['Glass Units'] || '';
    const date = j.dateAdded ? new Date(j.dateAdded).toLocaleDateString() : '';
    return `
      <div class="card" onclick='showJobDetail(${idx})'>
        <div class="card-header">
          <div class="card-name">${esc(name)}</div>
          <span class="badge ${stageInfo.cls}">${stageInfo.label}</span>
        </div>
        ${address ? `<div class="card-address">📍 ${esc(address)}</div>` : ''}
        <div class="card-meta">
          ${po ? `<span class="meta-text">PO: ${esc(po)}</span>` : ''}
          ${units ? `<span class="meta-text">• ${esc(units)} units</span>` : ''}
          ${date ? `<span class="meta-text">• ${date}</span>` : ''}
        </div>
      </div>`;
  }).join('');
}

function getStageName(job) {
  // Try to match stage name from known stages
  const stageId = job.pipelineStageId || '';
  const stageName = job.stage_name || job.pipelineStageName || '';
  if (stageName) return stageName;
  // Fallback
  return job.status || 'unknown';
}

function showJobDetail(idx) {
  const job = allJobs[idx];
  if (!job) return;
  const name = job.contact?.name || job.name || 'Unknown';
  document.getElementById('modalTitle').textContent = name;

  let html = '';
  const fields = [
    ['Name', name],
    ['Email', job.contact?.email],
    ['Phone', job.contact?.phone],
    ['Address', job.contact?.address1],
    ['Pipeline Stage', job.pipelineStageName || job.status],
    ['Monetary Value', job.monetaryValue ? `$${Number(job.monetaryValue).toLocaleString()}` : null],
    ['Date Added', job.dateAdded ? new Date(job.dateAdded).toLocaleDateString() : null],
    ['Source', job.source],
  ];

  fields.forEach(([label, value]) => {
    if (value) {
      html += `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${esc(String(value))}</span></div>`;
    }
  });

  // Custom fields
  if (job.customFields && typeof job.customFields === 'object') {
    Object.entries(job.customFields).forEach(([k, v]) => {
      if (v) {
        html += `<div class="detail-row"><span class="detail-label">${esc(k)}</span><span class="detail-value">${esc(String(v))}</span></div>`;
      }
    });
  }

  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('jobModal').classList.add('show');
}

function closeModal() {
  document.getElementById('jobModal').classList.remove('show');
}

/* ---------- NEW ORDER PAGE ---------- */
let unitCount = 0;
let selectedContact = null;
let searchTimeout = null;

function initNewOrder() {
  unitCount = 0;
  addUnit();
  setupCustomerSearch();
}

function setupCustomerSearch() {
  const input = document.getElementById('customerSearch');
  const dropdown = document.getElementById('customerDropdown');
  if (!input) return;

  input.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    clearTimeout(searchTimeout);
    if (q.length < 2) { dropdown.classList.remove('show'); return; }
    searchTimeout = setTimeout(() => searchContacts(q), 400);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#customerSearch') && !e.target.closest('#customerDropdown')) {
      dropdown.classList.remove('show');
    }
  });
}

async function searchContacts(query) {
  const dropdown = document.getElementById('customerDropdown');
  try {
    const data = await ghlFetch(`/contacts/?locationId=${GHL_LOCATION}&query=${encodeURIComponent(query)}&limit=10`);
    const contacts = data.contacts || [];
    if (!contacts.length) {
      dropdown.innerHTML = '<div class="dropdown-item"><span class="dropdown-item-sub">No contacts found</span></div>';
    } else {
      dropdown.innerHTML = contacts.map((c, i) => `
        <div class="dropdown-item" onclick='selectContact(${JSON.stringify(c).replace(/'/g, "&#39;")})'>
          <div class="dropdown-item-name">${esc(c.name || c.firstName + ' ' + (c.lastName || ''))}</div>
          <div class="dropdown-item-sub">${esc(c.email || '')} ${c.address1 ? '• ' + esc(c.address1) : ''}</div>
        </div>`).join('');
    }
    dropdown.classList.add('show');
  } catch (err) {
    dropdown.innerHTML = '<div class="dropdown-item"><span class="dropdown-item-sub">Search unavailable</span></div>';
    dropdown.classList.add('show');
  }
}

function selectContact(contact) {
  selectedContact = contact;
  const name = contact.name || (contact.firstName + ' ' + (contact.lastName || '')).trim();
  document.getElementById('customerSearch').value = name;
  document.getElementById('customerName').value = name;
  document.getElementById('customerAddress').value = contact.address1 || '';

  // Auto-suggest PO
  const lastName = (contact.lastName || name.split(' ').pop() || '').trim();
  const streetNum = (contact.address1 || '').match(/^\d+/);
  if (lastName && streetNum) {
    document.getElementById('poNumber').value = `${lastName}-${streetNum[0]}`;
  }

  document.getElementById('customerDropdown').classList.remove('show');
}

function addUnit() {
  unitCount++;
  const container = document.getElementById('unitsContainer');
  const div = document.createElement('div');
  div.className = 'unit-card';
  div.id = `unit-${unitCount}`;
  div.setAttribute('data-unit', unitCount);
  div.innerHTML = buildUnitHTML(unitCount);
  container.appendChild(div);
  updateDeleteButtons();
}

function buildUnitHTML(n) {
  const fracOptions = FRACTIONS.map(f => `<option value="${f}">${f}</option>`).join('');
  return `
    <div class="unit-header">
      <span class="unit-number">Unit ${n}</span>
      <button class="unit-delete" onclick="deleteUnit(${n})" title="Delete unit">🗑️</button>
    </div>
    <div class="form-group">
      <label class="form-label">Unit Label (optional)</label>
      <input type="text" class="form-input unit-label" placeholder="e.g. Master bedroom, Living room west">
    </div>
    <div class="form-row" style="margin-bottom:.875rem;">
      <div class="form-group">
        <label class="form-label">Glass Thickness</label>
        <select class="form-select unit-thickness">
          <option value="5/8">5/8"</option>
          <option value="3/4">3/4"</option>
          <option value="1 inch">1 inch</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Glass Type</label>
        <select class="form-select unit-type">
          <option value="Clear Annealed">Clear Annealed</option>
          <option value="Tempered">Tempered</option>
          <option value="Softcoat">Softcoat</option>
          <option value="Low-E">Low-E</option>
          <option value="Other">Other</option>
        </select>
      </div>
    </div>
    <label class="form-label">Width</label>
    <div class="dimension-group">
      <input type="number" class="dim-input unit-w-whole" placeholder="0" min="0" inputmode="numeric">
      <select class="dim-select unit-w-frac">${fracOptions}</select>
      <span class="dim-x">×</span>
      <label class="form-label" style="margin-bottom:0;">Height</label>
      <input type="number" class="dim-input unit-h-whole" placeholder="0" min="0" inputmode="numeric">
      <select class="dim-select unit-h-frac">${fracOptions}</select>
    </div>
    <div class="form-group">
      <label class="form-label">Quantity</label>
      <input type="number" class="form-input unit-qty" value="1" min="1" style="width:80px;" inputmode="numeric">
    </div>
    <div class="toggle-row">
      <span class="toggle-label">Grids</span>
      <label class="toggle">
        <input type="checkbox" class="unit-grid-toggle" onchange="toggleGrid(${n})">
        <span class="toggle-slider"></span>
      </label>
    </div>
    <div class="grid-options" id="gridOpts-${n}">
      <div class="form-row" style="margin-bottom:.875rem;">
        <div class="form-group">
          <label class="form-label">Grid Color</label>
          <select class="form-select unit-grid-color">
            <option>White</option><option>Bronze</option><option>Tan</option><option>Black</option><option>None</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Grid Size</label>
          <select class="form-select unit-grid-size">
            <option>5/8</option><option>7/8</option><option>Other</option>
          </select>
        </div>
      </div>
      <div class="form-row" style="margin-bottom:.875rem;">
        <div class="form-group">
          <label class="form-label">Grid Profile</label>
          <select class="form-select unit-grid-profile">
            <option>Flat</option><option>Contoured</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Grid Pattern</label>
          <select class="form-select unit-grid-pattern">
            <option>2x2</option><option>2x3</option><option>2x4</option><option>3x3</option><option>3x4</option><option>4x4</option><option>Other</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">BEG Measurements</label>
        <input type="text" class="form-input unit-beg" placeholder="e.g. 11 7/8, 23 1/4, 34 3/4">
      </div>
    </div>`;
}

function toggleGrid(n) {
  const card = document.getElementById(`unit-${n}`);
  if (!card) return;
  const checked = card.querySelector('.unit-grid-toggle').checked;
  const opts = document.getElementById(`gridOpts-${n}`);
  if (opts) opts.classList.toggle('show', checked);
}

function deleteUnit(n) {
  const cards = document.querySelectorAll('.unit-card');
  if (cards.length <= 1) return;
  const card = document.getElementById(`unit-${n}`);
  if (card) card.remove();
  updateDeleteButtons();
  renumberUnits();
}

function updateDeleteButtons() {
  const cards = document.querySelectorAll('.unit-card');
  cards.forEach(c => {
    const btn = c.querySelector('.unit-delete');
    if (btn) btn.disabled = cards.length <= 1;
  });
}

function renumberUnits() {
  const cards = document.querySelectorAll('.unit-card');
  cards.forEach((c, i) => {
    c.querySelector('.unit-number').textContent = `Unit ${i + 1}`;
  });
}

function gatherUnits() {
  const cards = document.querySelectorAll('.unit-card');
  return Array.from(cards).map((c, i) => {
    const g = (cls) => {
      const el = c.querySelector(`.${cls}`);
      return el ? (el.value || '') : '';
    };
    const hasGrid = c.querySelector('.unit-grid-toggle')?.checked || false;
    return {
      num: i + 1,
      label: g('unit-label'),
      thickness: g('unit-thickness'),
      type: g('unit-type'),
      wWhole: g('unit-w-whole'),
      wFrac: g('unit-w-frac'),
      hWhole: g('unit-h-whole'),
      hFrac: g('unit-h-frac'),
      qty: g('unit-qty') || '1',
      hasGrid,
      gridColor: hasGrid ? g('unit-grid-color') : '',
      gridSize: hasGrid ? g('unit-grid-size') : '',
      gridProfile: hasGrid ? g('unit-grid-profile') : '',
      gridPattern: hasGrid ? g('unit-grid-pattern') : '',
      beg: hasGrid ? g('unit-beg') : '',
    };
  });
}

function buildOrderText() {
  const po = document.getElementById('poNumber')?.value || '';
  const notes = document.getElementById('orderNotes')?.value || '';
  const units = gatherUnits();
  const totalQty = units.reduce((s, u) => s + parseInt(u.qty || 1), 0);

  let text = `NW Glass,\n\nWe need ${totalQty} glass unit(s) please.\n\nPO- ${po}\n`;

  units.forEach(u => {
    const labelStr = u.label ? ` — ${u.label}` : '';
    const wStr = `${u.wWhole || '0'} ${u.wFrac !== '0' ? u.wFrac : ''}`.trim();
    const hStr = `${u.hWhole || '0'} ${u.hFrac !== '0' ? u.hFrac : ''}`.trim();

    text += `\nUnit ${u.num}${labelStr}\n`;
    text += `Overall- ${u.thickness} ${u.type}\n`;
    text += `Size: ${wStr} x ${hStr} - ${u.qty} unit(s)\n`;

    if (u.hasGrid) {
      text += `${u.gridColor} grids, ${u.gridSize} ${u.gridProfile}. ${u.gridPattern} pattern.\n`;
      if (u.beg) text += `BEG- ${u.beg}\n`;
    } else {
      text += `No grids\n`;
    }
  });

  if (notes) text += `\n${notes}\n`;

  text += `\nPlease charge the card on file and send me the delivery date.\n\nCheers!\nSergei Fedorov\n206-353-0627 cell/text\nSeattleHomeWindows.com`;

  return text;
}

function previewOrder() {
  const name = document.getElementById('customerName')?.value;
  if (!name) {
    showToast('Please enter a customer name');
    return;
  }
  const text = buildOrderText();
  document.getElementById('previewText').textContent = text;
  document.getElementById('previewModal').classList.add('show');
}

function closePreviewModal() {
  document.getElementById('previewModal').classList.remove('show');
}

function copyOrder() {
  const text = buildOrderText();
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copied to clipboard!');
  });
}

function sendOrder() {
  const po = document.getElementById('poNumber')?.value || '';
  const customerName = document.getElementById('customerName')?.value || '';
  const text = buildOrderText();
  const subject = encodeURIComponent(`Glass Order — ${customerName} — PO ${po}`);
  const body = encodeURIComponent(text);
  window.location.href = `mailto:orders@nwglassmfg.com?subject=${subject}&body=${body}`;

  closePreviewModal();
  setTimeout(() => {
    document.getElementById('successOverlay').classList.add('show');
  }, 500);
}

async function saveToGHL() {
  if (!selectedContact) {
    showToast('No GHL contact selected');
    document.getElementById('successOverlay').classList.remove('show');
    return;
  }
  try {
    const units = gatherUnits();
    const specsText = units.map(u => {
      const wStr = `${u.wWhole || '0'} ${u.wFrac !== '0' ? u.wFrac : ''}`.trim();
      const hStr = `${u.hWhole || '0'} ${u.hFrac !== '0' ? u.hFrac : ''}`.trim();
      return `Unit ${u.num}: ${u.thickness} ${u.type}, ${wStr}x${hStr}, Qty ${u.qty}${u.hasGrid ? `, ${u.gridColor} grids` : ''}`;
    }).join(' | ');

    // Try to add a note to the contact
    await ghlFetch(`/contacts/${selectedContact.id}/notes`, {
      method: 'POST',
      body: JSON.stringify({
        body: `Glass Order Placed:\n${buildOrderText()}`,
        userId: selectedContact.id
      })
    });
    showToast('Saved to GHL!');
  } catch (err) {
    showToast('Could not save to GHL');
    console.error(err);
  }
  document.getElementById('successOverlay').classList.remove('show');
}

function resetOrder() {
  document.getElementById('successOverlay').classList.remove('show');
  document.getElementById('customerSearch').value = '';
  document.getElementById('customerName').value = '';
  document.getElementById('customerAddress').value = '';
  document.getElementById('poNumber').value = '';
  document.getElementById('orderNotes').value = '';
  selectedContact = null;
  unitCount = 0;
  document.getElementById('unitsContainer').innerHTML = '';
  addUnit();
}

/* ---------- WORK ORDERS PAGE ---------- */
function initWorkOrders() {
  loadWorkOrders();
}

async function loadWorkOrders() {
  const container = document.getElementById('woList');
  try {
    const data = await ghlFetch(`/opportunities/search?location_id=${GHL_LOCATION}&limit=50`);
    const allOps = data.opportunities || [];
    // Filter for "Job Scheduled" stage
    const scheduled = allOps.filter(j => {
      const stage = (j.pipelineStageName || j.stage_name || j.status || '').toLowerCase();
      return stage.includes('scheduled') || stage.includes('job scheduled');
    });
    localStorage.setItem('shw_wo_cache', JSON.stringify(scheduled));
    renderWorkOrders(scheduled);
  } catch (err) {
    const cached = localStorage.getItem('shw_wo_cache');
    if (cached) {
      renderWorkOrders(JSON.parse(cached));
      showToast('Using cached data (offline)');
    } else {
      container.innerHTML = `
        <div class="error-state">
          <div class="error-text">⚠️ Could not load work orders</div>
          <button class="btn btn-primary btn-sm" style="margin-top:1rem;width:auto;" onclick="loadWorkOrders()">Retry</button>
        </div>`;
    }
  }
}

function renderWorkOrders(orders) {
  const container = document.getElementById('woList');
  if (!orders.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-text">No scheduled work orders</div></div>';
    return;
  }

  container.innerHTML = orders.map((j, idx) => {
    const name = j.contact?.name || j.name || 'Unknown';
    const address = j.contact?.address1 || '';
    const mapsUrl = address ? `https://maps.apple.com/?q=${encodeURIComponent(address)}` : '#';
    const scheduledDate = j.customFields?.scheduled_date || j.customFields?.['Scheduled Date'] || '';
    const installer = j.customFields?.installer || j.customFields?.['Installer'] || 'Unassigned';
    const numWindows = j.customFields?.glass_units || j.customFields?.['Glass Units'] || '';
    const serviceType = j.customFields?.service_type || j.customFields?.['Service Type'] || 'Window Replacement';
    const accessNotes = j.customFields?.access_notes || j.customFields?.['Access Notes'] || '';
    const glassSpecs = j.customFields?.glass_specs || j.customFields?.['Glass Specs'] || '';

    return `
      <div class="card wo-card">
        <div class="card-name" style="margin-bottom:.25rem;">${esc(name)}</div>
        ${address ? `<a href="${mapsUrl}" class="wo-address-link" target="_blank">📍 ${esc(address)} →</a>` : ''}
        ${scheduledDate ? `<div class="wo-date" style="margin-top:.5rem;">📅 ${esc(scheduledDate)}</div>` : ''}
        <div class="wo-info">👷 ${esc(installer)}</div>
        ${numWindows ? `<div class="wo-info">🪟 ${esc(numWindows)} windows • ${esc(serviceType)}</div>` : ''}
        ${accessNotes ? `<div class="wo-info">🔑 ${esc(accessNotes)}</div>` : ''}
        ${glassSpecs ? `<div class="wo-specs">${esc(glassSpecs)}</div>` : ''}
        <button class="btn btn-success btn-sm" style="margin-top:.75rem;" onclick="markComplete('${j.id}', this)">✅ Mark Complete</button>
      </div>`;
  }).join('');
}

async function markComplete(oppId, btn) {
  if (!confirm('Mark this job as complete?')) return;
  btn.disabled = true;
  btn.textContent = 'Updating...';
  try {
    // We need to find the "Job Complete" stage ID — try updating status
    await ghlFetch(`/opportunities/${oppId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'won' })
    });
    showToast('Job marked complete!');
    btn.textContent = '✅ Completed';
    btn.style.background = 'var(--gray-300)';
    btn.style.color = 'var(--gray-600)';
    // Reload after delay
    setTimeout(() => loadWorkOrders(), 1500);
  } catch (err) {
    showToast('Could not update — try again');
    btn.disabled = false;
    btn.textContent = '✅ Mark Complete';
    console.error(err);
  }
}

/* ---------- HELPERS ---------- */
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
