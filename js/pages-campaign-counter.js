// Campaign Counter Script with Supabase Integration

const supabaseClient = window.supabase.createClient('https://neuyjcotcmjnndjyzbcq.supabase.co', 'sb_publishable_BGon7fPsvXNe59meFE9F4Q_SbjCa-Dp');

const counters = {
  campaign1: { value: 1, color: 'primary', name: 'Name 1' },
  campaign2: { value: 1, color: 'success', name: 'Name 2' },
  campaign3: { value: 1, color: 'warning', name: 'Name 3' },
  campaign4: { value: 1, color: 'info', name: 'Name 4' }
};

let currentTab = 'campaign1';
let currentEditCounter = null;
let currentEditTab = null;

async function loadCounterFromSupabase(campaignType) {
  try {
    const { data, error } = await supabaseClient
      .from('campaign_counters')
      .select('value, name')
      .eq('campaign_type', campaignType)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? { value: data.value, name: data.name } : null;
  } catch (error) {
    console.error('Error loading counter:', error);
    return null;
  }
}

async function saveCounterToSupabase(campaignType, value) {
  try {
    const { error } = await supabaseClient
      .from('campaign_counters')
      .upsert({ campaign_type: campaignType, value: value, name: counters[campaignType].name, updated_at: new Date().toISOString() }, { onConflict: 'campaign_type' });
    if (error) throw error;
  } catch (error) {
    console.error('Error saving counter:', error);
  }
}

async function saveTabNameToSupabase(campaignType, name) {
  try {
    const { error } = await supabaseClient
      .from('campaign_counters')
      .upsert({ campaign_type: campaignType, name: name, value: counters[campaignType].value, updated_at: new Date().toISOString() }, { onConflict: 'campaign_type' });
    if (error) throw error;
  } catch (error) {
    console.error('Error saving tab name:', error);
  }
}

async function saveHistoryToSupabase(campaignType, action, value) {
  try {
    const { error } = await supabaseClient
      .from('campaign_history')
      .insert({ campaign_type: campaignType, action: action, value: value, created_at: new Date().toISOString() });
    if (error) throw error;
  } catch (error) {
    console.error('Error saving history:', error);
  }
}

async function loadHistoryFromSupabase(campaignType) {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data, error } = await supabaseClient
      .from('campaign_history')
      .select('*')
      .eq('campaign_type', campaignType)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  try {
    for (const type of Object.keys(counters)) {
      const savedData = await loadCounterFromSupabase(type);
      if (savedData) {
        if (savedData.value !== null) counters[type].value = savedData.value;
        if (savedData.name) counters[type].name = savedData.name;
      }
    }
  } catch (error) {
    console.error('Error loading from Supabase, using defaults:', error);
  }
  setupTabs();
  loadTabNames();
  Object.keys(counters).forEach(type => {
    updateCounterDisplay(type);
    updateHistoryDisplay(type);
  });
});

function loadTabNames() {
  Object.keys(counters).forEach(type => {
    document.querySelectorAll(`[data-tab="${type}"] .tab-name`).forEach(tabName => {
      tabName.textContent = counters[type].name;
    });
    document.querySelectorAll(`#${type}-tab .counter-container h2`).forEach(counterTitle => {
      counterTitle.innerHTML = `${counters[type].name} Counter
        <button class="edit-icon" onclick="editCounter('${type}')" title="Edit manually">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>`;
    });
    document.querySelectorAll(`[data-tab="${type}"]`).forEach(tabBtn => {
      tabBtn.title = `${counters[type].name} - Double click to edit`;
    });
  });
}

function openTabNameModal(type) {
  currentEditTab = type;
  const modal = document.getElementById('tab-name-modal');
  const input = document.getElementById('tab-name-input');
  input.value = counters[type].name;
  modal.style.display = 'flex';
  input.focus();
  input.select();
}

function closeTabNameModal() {
  document.getElementById('tab-name-modal').style.display = 'none';
  currentEditTab = null;
}

async function confirmTabName() {
  const input = document.getElementById('tab-name-input');
  const newName = input.value.trim();
  if (newName && currentEditTab) {
    counters[currentEditTab].name = newName;
    await saveTabNameToSupabase(currentEditTab, newName);
    document.querySelectorAll(`[data-tab="${currentEditTab}"] .tab-name`).forEach(tabName => {
      tabName.textContent = newName;
    });
    document.querySelectorAll(`#${currentEditTab}-tab .counter-container h2`).forEach(counterTitle => {
      counterTitle.innerHTML = `${newName} Counter
        <button class="edit-icon" onclick="editCounter('${currentEditTab}')" title="Edit manually">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>`;
    });
    document.querySelectorAll(`[data-tab="${currentEditTab}"]`).forEach(tabBtn => {
      tabBtn.title = `${newName} - Double click to edit`;
    });
    closeTabNameModal();
  }
}

function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const tabName = this.dataset.tab;
      switchTab(tabName);
      document.querySelectorAll('.counter-tabs').forEach(container => {
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        container.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
      });
    });
    btn.addEventListener('dblclick', function(e) {
      e.stopPropagation();
      openTabNameModal(this.dataset.tab);
    });
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
  document.getElementById(`${tabName}-tab`).classList.add('active');
  currentTab = tabName;
}

async function updateCounterDisplay(type) {
  const counter = counters[type];
  document.getElementById(`${type}-number`).textContent = String(counter.value).padStart(4, '0');
  const progress = ((counter.value % 100) / 100) * 100;
  document.getElementById(`${type}-progress`).style.width = progress + '%';
  const updatedEl = document.getElementById(`${type}-updated`);
  if (updatedEl) {
    updatedEl.textContent = 'Last updated: ' + formatDateTime(new Date());
  }
  try {
    const history = await loadHistoryFromSupabase(type);
    const cacheEl = document.getElementById(`${type}-cache`);
    if (cacheEl) {
      cacheEl.textContent = history.length;
    }
  } catch (error) {
    console.error('Error loading history count:', error);
  }
}

async function addCounter(type) {
  try {
    counters[type].value++;
    await saveCounterToSupabase(type, counters[type].value);
    await updateCounterDisplay(type);
    await addToHistory(type, counters[type].value, 'generated');
    console.log(`New ${type} ID: ` + String(counters[type].value).padStart(4, '0'));
  } catch (error) {
    console.error('Error in addCounter:', error);
    counters[type].value--;
  }
}

async function decrementCounter(type) {
  if (counters[type].value > 1) {
    try {
      counters[type].value--;
      await saveCounterToSupabase(type, counters[type].value);
      await updateCounterDisplay(type);
      await addToHistory(type, counters[type].value, 'reverted');
      console.log(`${type} ID reverted to: ` + String(counters[type].value).padStart(4, '0'));
    } catch (error) {
      console.error('Error in decrementCounter:', error);
      counters[type].value++;
    }
  }
}

function editCounter(type) {
  if (!counters[type]) {
    console.error('Counter type not found:', type);
    return;
  }
  currentEditCounter = type;
  const modal = document.getElementById('edit-modal');
  const input = document.getElementById('modal-input');
  const title = document.getElementById('modal-title');
  input.value = counters[type].value;
  title.textContent = `Edit ${counters[type].name} ID`;
  modal.style.display = 'flex';
  input.focus();
  input.select();
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  currentEditCounter = null;
}

async function confirmEditCounter() {
  const input = document.getElementById('modal-input');
  const newValue = parseInt(input.value);
  if (newValue >= 1 && newValue <= 9999 && currentEditCounter && counters[currentEditCounter]) {
    try {
      counters[currentEditCounter].value = newValue;
      await saveCounterToSupabase(currentEditCounter, counters[currentEditCounter].value);
      await updateCounterDisplay(currentEditCounter);
      await addToHistory(currentEditCounter, counters[currentEditCounter].value, 'manual_edit');
      console.log(`${counters[currentEditCounter].name} ID updated to ` + String(counters[currentEditCounter].value).padStart(4, '0'));
      closeEditModal();
    } catch (error) {
      console.error('Error in confirmEditCounter:', error);
    }
  } else {
    alert('Please enter a valid number (1-9999)');
    input.focus();
  }
}

async function addToHistory(type, value, action) {
  await saveHistoryToSupabase(type, action, value);
  await updateHistoryDisplay(type);
}

async function updateHistoryDisplay(type) {
  const historyList = document.getElementById(`${type}-history`);
  if (!historyList) return;
  try {
    const history = await loadHistoryFromSupabase(type);
    historyList.innerHTML = history.slice(0, 10).map(entry => `
      <div class="history-item">
        <i class="fa-solid fa-${entry.action === 'generated' ? 'plus-circle' : entry.action === 'reverted' ? 'rotate-left' : 'edit'}"></i>
        <div>
          <strong>${String(entry.value).padStart(4, '0')}</strong>
          <time>${formatTime(entry.created_at)}</time>
        </div>
      </div>
    `).join('');
    const cacheEl = document.getElementById(`${type}-cache`);
    if (cacheEl) {
      cacheEl.textContent = history.length;
    }
  } catch (error) {
    console.error('Error updating history display:', error);
    historyList.innerHTML = '<p style="color: #666;">Unable to load history</p>';
  }
}

function formatDateTime(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function formatTime(timestamp) {
  return formatDateTime(timestamp);
}

async function loadMoreHistory(type) {
  const historyList = document.getElementById(`${type}-history`);
  const currentCount = historyList.children.length;
  const history = await loadHistoryFromSupabase(type);
  const moreItems = history.slice(currentCount, currentCount + 10);
  moreItems.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <i class="fa-solid fa-${entry.action === 'generated' ? 'plus-circle' : entry.action === 'reverted' ? 'rotate-left' : 'edit'}"></i>
      <div>
        <strong>${String(entry.value).padStart(4, '0')}</strong>
        <time>${formatTime(entry.created_at)}</time>
      </div>
    `;
    historyList.appendChild(item);
  });
  if (currentCount + 10 >= history.length) {
    event.target.style.display = 'none';
  }
}

document.getElementById('edit-modal').addEventListener('click', function(e) {
  if (e.target === this) closeEditModal();
});

document.getElementById('tab-name-modal').addEventListener('click', function(e) {
  if (e.target === this) closeTabNameModal();
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeEditModal();
    closeTabNameModal();
  }
});

document.getElementById('modal-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') confirmEditCounter();
});

document.getElementById('tab-name-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') confirmTabName();
});

document.getElementById('modal-input').addEventListener('input', function(e) {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
});
