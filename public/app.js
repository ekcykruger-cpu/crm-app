// =============================================================================
// app.js  –  CRM Frontend Logic
// =============================================================================
// This file controls everything the user sees and does in the browser.
// It talks to the server via "fetch" calls (HTTP requests to our API).
//
// Structure:
//   1. State         – variables that track what's currently shown
//   2. API Helpers   – reusable functions to call the server
//   3. Render        – functions that draw/update the UI
//   4. Events        – button clicks, form submits, input changes
//   5. Init          – runs once when the page loads
// =============================================================================


// ─── 1. STATE ─────────────────────────────────────────────────────────────────
// These variables remember what the app is currently showing.

let allCustomers = [];         // Full list of customers from the server
let currentCustomerId = null;  // ID of the customer being viewed/edited
let settings = {};             // Custom field labels from the server
let isNewCustomer = false;     // Are we creating a new customer (vs editing)?


// ─── 2. API HELPERS ───────────────────────────────────────────────────────────
// Each function calls one of the server's API endpoints.
// They all return the parsed JSON response (or throw an error).

async function apiFetch(url, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Server error');
  return data;
}

// Convenience wrappers
const api = {
  getCustomers:    ()       => apiFetch('/api/customers'),
  getCustomer:     (id)     => apiFetch(`/api/customers/${id}`),
  createCustomer:  (data)   => apiFetch('/api/customers', 'POST', data),
  updateCustomer:  (id, d)  => apiFetch(`/api/customers/${id}`, 'PUT', d),
  deleteCustomer:  (id)     => apiFetch(`/api/customers/${id}`, 'DELETE'),

  getHistory:      (id)     => apiFetch(`/api/customers/${id}/history`),
  addHistory:      (id, d)  => apiFetch(`/api/customers/${id}/history`, 'POST', d),
  deleteHistory:   (hid)    => apiFetch(`/api/history/${hid}`, 'DELETE'),

  getSettings:     ()       => apiFetch('/api/settings'),
  saveSettings:    (data)   => apiFetch('/api/settings', 'PUT', data),
};


// ─── 3. RENDER FUNCTIONS ──────────────────────────────────────────────────────

// Renders the customer list sidebar
function renderCustomerList(customers) {
  const list   = document.getElementById('customer-list');
  const empty  = document.getElementById('list-empty');

  // Remove all existing customer items (but keep the empty-state div)
  list.querySelectorAll('.customer-item').forEach(el => el.remove());

  if (customers.length === 0) {
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  customers.forEach(c => {
    const initials = (c.first_name[0] || '') + (c.last_name[0] || '');

    const item = document.createElement('div');
    item.className = 'customer-item' + (c.id === currentCustomerId ? ' active' : '');
    item.dataset.id = c.id;

    item.innerHTML = `
      <div class="customer-avatar">${initials.toUpperCase()}</div>
      <div class="customer-info">
        <div class="customer-name">${c.first_name} ${c.last_name}</div>
        <div class="customer-meta">${c.email || c.phone || '—'}</div>
      </div>
    `;

    item.addEventListener('click', () => loadCustomer(c.id));
    list.appendChild(item);
  });
}


// Populates the customer form with data from the server
function populateForm(customer) {
  document.getElementById('customer-id').value      = customer.id || '';
  document.getElementById('first_name').value       = customer.first_name || '';
  document.getElementById('last_name').value        = customer.last_name || '';
  document.getElementById('phone').value            = customer.phone || '';
  document.getElementById('email').value            = customer.email || '';
  document.getElementById('fb_handle').value        = customer.fb_handle || '';
  document.getElementById('twitter_handle').value   = customer.twitter_handle || '';
  document.getElementById('custom_field_1').value   = customer.custom_field_1 || '';
  document.getElementById('custom_field_2').value   = customer.custom_field_2 || '';
  document.getElementById('custom_field_3').value   = customer.custom_field_3 || '';
  document.getElementById('custom_field_4').value   = customer.custom_field_4 || '';
  document.getElementById('custom_field_5').value   = customer.custom_field_5 || '';
}


// Applies custom field labels from settings to the form
function applyLabels() {
  for (let i = 1; i <= 5; i++) {
    const label = settings[`custom_label_${i}`] || `Custom Field ${i}`;
    document.getElementById(`label_${i}`).textContent   = label;
    document.getElementById(`s_label_${i}`).value       = label;
    document.getElementById(`custom_field_${i}`).placeholder = label;
  }
}


// Renders the contact history table for the current customer
function renderHistory(records) {
  const tbody = document.getElementById('history-body');
  const empty = document.getElementById('history-empty');
  const table = document.getElementById('history-table');

  tbody.innerHTML = '';

  if (records.length === 0) {
    table.style.display  = 'none';
    empty.style.display  = '';
    return;
  }

  table.style.display = '';
  empty.style.display = 'none';

  records.forEach(r => {
    // Format the date nicely: 2024-03-15 → 15 Mar
    const dateObj = new Date(r.contact_date);
    const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    // Trim time to hh:mm
    const timeStr = r.contact_time ? r.contact_time.substring(0, 5) : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dateStr}</td>
      <td>${timeStr}</td>
      <td title="${r.agent || ''}">${truncate(r.agent, 8)}</td>
      <td title="${r.contact_to || ''}">${truncate(r.contact_to, 10)}</td>
      <td>${r.duration || ''}</td>
      <td title="${r.disposition_code || ''}">${truncate(r.disposition_code, 8)}</td>
      <td class="notes-cell" title="${r.notes || ''}">${r.notes || ''}</td>
      <td>
        <button class="btn-row-delete" data-history-id="${r.id}" title="Delete record">✕</button>
      </td>
    `;

    // Wire up the delete button for this row
    tr.querySelector('.btn-row-delete').addEventListener('click', () => deleteHistoryRecord(r.id));

    tbody.appendChild(tr);
  });
}


// Helper to truncate long strings in table cells
function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '…' : str;
}


// Shows a toast message briefly at the bottom of the screen
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className   = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.className = 'toast';
  }, 2800);
}


// Shows or hides the main panels
function showPanel(which) {
  // which: 'none' | 'detail' | 'settings'
  document.getElementById('detail-panel').style.display   = which === 'detail'   ? '' : 'none';
  document.getElementById('settings-panel').style.display = which === 'settings' ? '' : 'none';
}


// ─── 4. ACTION FUNCTIONS ──────────────────────────────────────────────────────

// Loads a customer's full details and history into the detail panel
async function loadCustomer(id) {
  try {
    currentCustomerId = id;
    isNewCustomer = false;

    const customer = await api.getCustomer(id);
    const history  = await api.getHistory(id);

    // Update panel title
    document.getElementById('panel-title').textContent =
      `${customer.first_name} ${customer.last_name}`;

    // Fill the form
    populateForm(customer);

    // Show delete button and history section for existing customers
    document.getElementById('danger-zone').style.display    = '';
    document.getElementById('history-section').style.display = '';

    // Render history
    renderHistory(history);

    // Close the add-contact form if it was open
    document.getElementById('add-contact-form').style.display = 'none';

    // Show the detail panel
    showPanel('detail');

    // Highlight active customer in list
    document.querySelectorAll('.customer-item').forEach(el => {
      el.classList.toggle('active', parseInt(el.dataset.id) === id);
    });

  } catch (err) {
    showToast('Failed to load customer: ' + err.message, true);
  }
}


// Prepares the form for a new (blank) customer
function startNewCustomer() {
  currentCustomerId = null;
  isNewCustomer = true;

  document.getElementById('panel-title').textContent = 'New Customer';
  populateForm({});   // Pass empty object to clear the form

  // Hide delete button and history section for a new customer
  document.getElementById('danger-zone').style.display     = 'none';
  document.getElementById('history-section').style.display = 'none';

  showPanel('detail');

  // Remove active highlight from list
  document.querySelectorAll('.customer-item').forEach(el => el.classList.remove('active'));

  document.getElementById('first_name').focus();
}


// Reads the form and returns an object with all field values
function getFormData() {
  return {
    first_name:     document.getElementById('first_name').value.trim(),
    last_name:      document.getElementById('last_name').value.trim(),
    phone:          document.getElementById('phone').value.trim(),
    email:          document.getElementById('email').value.trim(),
    fb_handle:      document.getElementById('fb_handle').value.trim(),
    twitter_handle: document.getElementById('twitter_handle').value.trim(),
    custom_field_1: document.getElementById('custom_field_1').value.trim(),
    custom_field_2: document.getElementById('custom_field_2').value.trim(),
    custom_field_3: document.getElementById('custom_field_3').value.trim(),
    custom_field_4: document.getElementById('custom_field_4').value.trim(),
    custom_field_5: document.getElementById('custom_field_5').value.trim(),
  };
}


// Saves the customer form (create or update)
async function saveCustomer() {
  const data = getFormData();

  if (!data.first_name || !data.last_name) {
    showToast('First and last name are required.', true);
    return;
  }

  try {
    if (isNewCustomer) {
      const created = await api.createCustomer(data);
      currentCustomerId = created.id;
      isNewCustomer = false;
      showToast('Customer created.');
    } else {
      await api.updateCustomer(currentCustomerId, data);
      showToast('Customer saved.');
    }

    // Refresh the customer list and reload the customer
    allCustomers = await api.getCustomers();
    renderCustomerList(allCustomers);
    await loadCustomer(currentCustomerId);

  } catch (err) {
    showToast('Save failed: ' + err.message, true);
  }
}


// Deletes the currently viewed customer
async function deleteCustomer() {
  if (!currentCustomerId) return;

  const name = document.getElementById('panel-title').textContent;
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

  try {
    await api.deleteCustomer(currentCustomerId);
    currentCustomerId = null;
    isNewCustomer = false;
    showPanel('none');

    allCustomers = await api.getCustomers();
    renderCustomerList(allCustomers);
    showToast('Customer deleted.');
  } catch (err) {
    showToast('Delete failed: ' + err.message, true);
  }
}


// Saves a new contact history record
async function saveContactRecord() {
  const contact_date     = document.getElementById('h_date').value;
  const contact_time     = document.getElementById('h_time').value;
  const agent            = document.getElementById('h_agent').value.trim();
  const contact_to       = document.getElementById('h_contact_to').value.trim();
  const duration         = document.getElementById('h_duration').value.trim();
  const disposition_code = document.getElementById('h_disposition').value.trim();
  const notes            = document.getElementById('h_notes').value.trim();

  if (!contact_date || !contact_time) {
    showToast('Date and Time are required.', true);
    return;
  }

  try {
    await api.addHistory(currentCustomerId, {
      contact_date, contact_time, agent, contact_to,
      duration, disposition_code, notes
    });

    // Clear the form
    ['h_date','h_time','h_agent','h_contact_to','h_duration','h_disposition','h_notes']
      .forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('notes-hint').textContent = '0 / 100';

    document.getElementById('add-contact-form').style.display = 'none';

    // Reload history table
    const history = await api.getHistory(currentCustomerId);
    renderHistory(history);
    showToast('Contact record added.');

  } catch (err) {
    showToast('Failed to save contact: ' + err.message, true);
  }
}


// Deletes a single contact history record
async function deleteHistoryRecord(historyId) {
  if (!confirm('Delete this contact record?')) return;
  try {
    await api.deleteHistory(historyId);
    const history = await api.getHistory(currentCustomerId);
    renderHistory(history);
    showToast('Record deleted.');
  } catch (err) {
    showToast('Delete failed: ' + err.message, true);
  }
}


// Saves the custom field labels from the settings panel
async function saveSettings() {
  const newSettings = {
    custom_label_1: document.getElementById('s_label_1').value.trim() || 'Custom Field 1',
    custom_label_2: document.getElementById('s_label_2').value.trim() || 'Custom Field 2',
    custom_label_3: document.getElementById('s_label_3').value.trim() || 'Custom Field 3',
    custom_label_4: document.getElementById('s_label_4').value.trim() || 'Custom Field 4',
    custom_label_5: document.getElementById('s_label_5').value.trim() || 'Custom Field 5',
  };

  try {
    await api.saveSettings(newSettings);
    settings = newSettings;
    applyLabels();
    showPanel('none');
    showToast('Settings saved.');
  } catch (err) {
    showToast('Failed to save settings: ' + err.message, true);
  }
}


// ─── 5. EVENT LISTENERS ───────────────────────────────────────────────────────
// Wire up all buttons and inputs here so the logic above stays clean.

// Top bar
document.getElementById('btn-new-customer').addEventListener('click', startNewCustomer);
document.getElementById('btn-settings').addEventListener('click', () => {
  showPanel('settings');
  applyLabels();
});

// Customer form
document.getElementById('btn-save').addEventListener('click', saveCustomer);
document.getElementById('btn-cancel').addEventListener('click', () => showPanel('none'));
document.getElementById('btn-delete').addEventListener('click', deleteCustomer);

// Settings panel
document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
document.getElementById('btn-close-settings').addEventListener('click', () => showPanel('none'));

// Contact history
document.getElementById('btn-add-contact').addEventListener('click', () => {
  const form = document.getElementById('add-contact-form');
  form.style.display = form.style.display === 'none' ? '' : 'none';
  // Pre-fill today's date and current time as a convenience
  if (form.style.display !== 'none') {
    const now = new Date();
    document.getElementById('h_date').value = now.toISOString().split('T')[0];
    document.getElementById('h_time').value = now.toTimeString().substring(0, 5);
  }
});

document.getElementById('btn-save-contact').addEventListener('click', saveContactRecord);
document.getElementById('btn-cancel-contact').addEventListener('click', () => {
  document.getElementById('add-contact-form').style.display = 'none';
});

// Notes character counter
document.getElementById('h_notes').addEventListener('input', function () {
  document.getElementById('notes-hint').textContent = `${this.value.length} / 100`;
});

// Search / filter the customer list
document.getElementById('search-input').addEventListener('input', function () {
  const q = this.value.toLowerCase();
  const filtered = allCustomers.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
    (c.email  && c.email.toLowerCase().includes(q)) ||
    (c.phone  && c.phone.toLowerCase().includes(q))
  );
  renderCustomerList(filtered);
});


// ─── 6. INIT ──────────────────────────────────────────────────────────────────
// Runs once when the page loads: fetch settings and customer list.

async function init() {
  try {
    // Load settings (custom field labels) and customer list in parallel
    [settings, allCustomers] = await Promise.all([
      api.getSettings(),
      api.getCustomers()
    ]);

    applyLabels();
    renderCustomerList(allCustomers);

  } catch (err) {
    showToast('Could not connect to server: ' + err.message, true);
  }
}

init();
