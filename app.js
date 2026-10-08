/**
 * TaskFlow — Modern To-Do List Application & Multi-Tool Suite
 */

// Application State
let items = [];
let currentFilter = 'all';
let searchQuery = '';
let fileHandle = null;

// DOM Element References — Header & Tabs
const themeToggle = document.querySelector('#theme-toggle');
const currentDateEl = document.querySelector('#current-date');
const navTabs = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.app-tab-content');

// DOM Element References — Tasks Tab
const form = document.querySelector('#todo-form');
const input = document.querySelector('#new-item');
const priorityInput = document.querySelector('#priority');
const sortBtn = document.querySelector('#sort-btn');
const itemsList = document.querySelector('#items');
const searchInput = document.querySelector('#search-input');
const clearSearchBtn = document.querySelector('#clear-search');
const filterTabs = document.querySelectorAll('.filter-tab');
const clearCompletedBtn = document.querySelector('#clear-completed-btn');
const progressText = document.querySelector('#progress-text');
const progressPercent = document.querySelector('#progress-percent');
const progressFill = document.querySelector('#progress-fill');
const saveFileBtn = document.querySelector('#save-file-btn');
const openFileBtn = document.querySelector('#open-file-btn');
const fileInput = document.querySelector('#file-input');
const toastContainer = document.querySelector('#toast-container');

// DOM Element References — Stopwatch Tab
const swDisplay = document.querySelector('#sw-display');
const swStartBtn = document.querySelector('#sw-start');
const swStopBtn = document.querySelector('#sw-stop');
const swLapBtn = document.querySelector('#sw-lap');
const swResetBtn = document.querySelector('#sw-reset');
const swLapsWrapper = document.querySelector('#sw-laps-wrapper');
const swLapsList = document.querySelector('#sw-laps');

// DOM Element References — Timer Tab
const tmDisplay = document.querySelector('#tm-display');
const tmInputSeconds = document.querySelector('#tm-input-seconds');
const tmStartBtn = document.querySelector('#tm-start');
const tmStopBtn = document.querySelector('#tm-stop');
const tmResetBtn = document.querySelector('#tm-reset');
const tmPresetBtns = document.querySelectorAll('.tm-preset');

// DOM Element References — Alarm Tab
const alarmClockDisplay = document.querySelector('#alarm-clock-display');
const alarmTimeInput = document.querySelector('#alarm-time-input');
const setAlarmBtn = document.querySelector('#set-alarm-btn');
const clearAlarmBtn = document.querySelector('#clear-alarm-btn');
const alarmStatusBadge = document.querySelector('#alarm-status');
const alarmTargetText = document.querySelector('#alarm-target-text');

// Priority Names mapping
const PRIORITY_LABELS = {
  1: 'P1 Low',
  2: 'P2 Low',
  3: 'P3 Med',
  4: 'P4 High',
  5: 'P5 Critical'
};

// Initialize Application
function init() {
  setInitialTheme();
  displayDate();
  loadItemsFromStorage();
  attachEventListeners();
  initStopwatch();
  initTimer();
  initAlarmClock();
  render();
}

// Display Current Date
function displayDate() {
  if (!currentDateEl) return;
  const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  currentDateEl.textContent = new Date().toLocaleDateString('en-US', options) + ' • Multi-Tool Suite';
}

// Security: Escape HTML to prevent XSS
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Toast Notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${type === 'success' 
        ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' 
        : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'}
    </svg>
    <span>${escapeHTML(message)}</span>
  `;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 3000);
}

// Nav Tab Switcher (Part 4 requirement)
function switchTab(targetTabId) {
  navTabs.forEach(tab => {
    const isSelected = tab.dataset.tab === targetTabId;
    tab.classList.toggle('active', isSelected);
    tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
  });

  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === targetTabId);
  });
}

// LocalStorage Persistence
function saveItemsToStorage() {
  try {
    localStorage.setItem('taskflow_items', JSON.stringify(items));
  } catch (e) {
    console.error('LocalStorage save error:', e);
  }
}

function loadItemsFromStorage() {
  try {
    const stored = localStorage.getItem('taskflow_items');
    if (stored) {
      items = JSON.parse(stored);
    } else {
      items = [
        { id: '1', text: 'Welcome to TaskFlow! Double-click to edit me.', priority: 3, done: false, createdAt: Date.now() },
        { id: '2', text: 'Click "Save .txt" to download or sync tasks to a text file', priority: 5, done: false, createdAt: Date.now() - 1000 }
      ];
      saveItemsToStorage();
    }
  } catch (e) {
    console.error('LocalStorage load error:', e);
    items = [];
  }
}

// Text File Storage Utilities (.txt format)
function serializeToTxt(taskList) {
  return taskList.map(item => {
    const status = item.done ? '[x]' : '[ ]';
    const prio = `(P${item.priority || 3})`;
    return `${status} ${prio} ${item.text}`;
  }).join('\n');
}

function parseFromTxt(textContent) {
  try {
    const jsonParsed = JSON.parse(textContent);
    if (Array.isArray(jsonParsed)) {
      return jsonParsed.map(item => ({
        id: item.id || String(Date.now() + Math.random()),
        text: item.text || 'Untitled Task',
        priority: Math.min(5, Math.max(1, Number(item.priority) || 3)),
        done: Boolean(item.done),
        createdAt: item.createdAt || Date.now()
      }));
    }
  } catch (e) {}

  const lines = textContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  const parsedItems = [];

  for (const line of lines) {
    let done = false;
    let priority = 3;
    let text = line.trim();

    const doneMatch = text.match(/^\[([ xX])\]\s*/);
    if (doneMatch) {
      done = doneMatch[1].toLowerCase() === 'x';
      text = text.substring(doneMatch[0].length).trim();
    }

    const priorityMatch = text.match(/^\(P([1-5])\)\s*/i);
    if (priorityMatch) {
      priority = parseInt(priorityMatch[1], 10);
      text = text.substring(priorityMatch[0].length).trim();
    }

    if (text.length > 0) {
      parsedItems.push({
        id: String(Date.now() + Math.random()),
        text: text,
        priority: priority,
        done: done,
        createdAt: Date.now()
      });
    }
  }

  return parsedItems;
}

async function saveToTextFile() {
  const txtData = serializeToTxt(items);

  if ('showSaveFilePicker' in window) {
    try {
      if (!fileHandle) {
        fileHandle = await window.showSaveFilePicker({
          suggestedName: 'tasks.txt',
          types: [{ description: 'Text Files', accept: { 'text/plain': ['.txt'] } }]
        });
      }
      const writable = await fileHandle.createWritable();
      await writable.write(txtData);
      await writable.close();
      showToast('Tasks saved to text file!', 'success');
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  const blob = new Blob([txtData], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tasks.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Downloaded tasks.txt file', 'success');
}

async function openTextFile() {
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Text or JSON Files', accept: { 'text/plain': ['.txt'], 'application/json': ['.json'] } }]
      });
      fileHandle = handle;
      const file = await fileHandle.getFile();
      const text = await file.text();
      const imported = parseFromTxt(text);

      if (imported.length > 0) {
        items = imported;
        saveItemsToStorage();
        render();
        showToast(`Loaded ${imported.length} tasks from ${file.name}`, 'success');
      } else {
        showToast('No valid tasks found in file', 'warning');
      }
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  fileInput.click();
}

function handleFileInputChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const content = evt.target.result;
    const imported = parseFromTxt(content);
    if (imported.length > 0) {
      items = imported;
      saveItemsToStorage();
      render();
      showToast(`Imported ${imported.length} tasks from ${file.name}`, 'success');
    } else {
      showToast('No valid tasks found in file', 'warning');
    }
    fileInput.value = '';
  };
  reader.readAsText(file);
}

// Add Task Item
function addItem(e) {
  e.preventDefault();
  const text = input.value.trim();
  const priority = Number(priorityInput.value);

  if (!text) {
    showToast('Please enter a task description', 'warning');
    return;
  }

  items.unshift({
    id: String(Date.now()),
    text: text,
    priority: priority >= 1 && priority <= 5 ? priority : 3,
    done: false,
    createdAt: Date.now()
  });
  saveItemsToStorage();

  input.value = '';
  input.focus();
  render();
  showToast('Task added', 'info');
}

// Render Application UI
function render() {
  updateProgress();
  renderItems();
}

function updateProgress() {
  const total = items.length;
  const completed = items.filter(i => i.done).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  progressText.textContent = `${completed} of ${total} task${total === 1 ? '' : 's'} completed`;
  progressPercent.textContent = `${percent}%`;
  progressFill.style.width = `${percent}%`;
}

function getFilteredItems() {
  return items.filter(item => {
    const matchesFilter = 
      currentFilter === 'all' ? true :
      currentFilter === 'active' ? !item.done :
      currentFilter === 'completed' ? item.done : true;

    const matchesSearch = item.text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });
}

function renderItems() {
  const filtered = getFilteredItems();

  if (filtered.length === 0) {
    itemsList.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <path d="M9 14l2 2 4-4"/>
        </svg>
        <h3>${items.length === 0 ? 'No tasks yet' : 'No matching tasks'}</h3>
        <p>${items.length === 0 ? 'Add a task above or load a .txt file to get started.' : 'Try changing your filter or search criteria.'}</p>
      </div>
    `;
    return;
  }

  itemsList.innerHTML = filtered.map(item => {
    const isCompleted = item.done;
    const prioClass = `p-${item.priority}`;
    const prioLabel = PRIORITY_LABELS[item.priority] || `P${item.priority}`;

    return `
      <li class="task-item ${isCompleted ? 'completed' : ''}" draggable="true" data-id="${item.id}">
        <div class="drag-handle" title="Drag to reorder">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
        </div>
        <input type="checkbox" class="task-checkbox" ${isCompleted ? 'checked' : ''} aria-label="Mark completed">
        
        <div class="task-content">
          <span class="task-text">${escapeHTML(item.text)}</span>
        </div>

        <span class="priority-badge ${prioClass}">${prioLabel}</span>

        <div class="task-actions">
          <button class="action-btn edit-btn" title="Edit task">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn delete-btn" title="Delete task">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </li>
    `;
  }).join('');

  attachDragAndDrop();
}

// Inline Task Editing
function startEditing(taskItem, itemId) {
  const item = items.find(i => i.id === itemId);
  if (!item) return;

  const contentDiv = taskItem.querySelector('.task-content');
  const textSpan = contentDiv.querySelector('.task-text');
  
  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'edit-input';
  editInput.value = item.text;

  contentDiv.replaceChild(editInput, textSpan);
  editInput.focus();

  function saveEdit() {
    const newText = editInput.value.trim();
    if (newText && newText !== item.text) {
      item.text = newText;
      saveItemsToStorage();
      showToast('Task updated', 'info');
    }
    render();
  }

  editInput.addEventListener('blur', saveEdit);
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      editInput.removeEventListener('blur', saveEdit);
      saveEdit();
    } else if (e.key === 'Escape') {
      render();
    }
  });
}

function sortItems() {
  items.sort((a, b) => b.priority - a.priority);
  saveItemsToStorage();
  render();
  showToast('Sorted by priority (High to Low)', 'info');
}

function clearCompleted() {
  const completedCount = items.filter(i => i.done).length;
  if (completedCount === 0) {
    showToast('No completed tasks to clear', 'info');
    return;
  }

  items = items.filter(i => !i.done);
  saveItemsToStorage();
  render();
  showToast(`Cleared ${completedCount} completed task${completedCount === 1 ? '' : 's'}`, 'info');
}

// Theme Switcher
function setInitialTheme() {
  const savedTheme = localStorage.getItem('taskflow_theme') || 
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.body.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
  const current = document.body.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', next);
  localStorage.setItem('taskflow_theme', next);
}

// Drag & Drop
let draggedItem = null;

function attachDragAndDrop() {
  const listItems = itemsList.querySelectorAll('.task-item');
  
  listItems.forEach(li => {
    li.addEventListener('dragstart', (e) => {
      draggedItem = li;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', li.dataset.id);
    });

    li.addEventListener('dragend', () => {
      if (draggedItem) draggedItem.classList.remove('dragging');
      draggedItem = null;
    });

    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const target = e.target.closest('.task-item');
      if (target && target !== draggedItem) {
        const rect = target.getBoundingClientRect();
        const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
        itemsList.insertBefore(draggedItem, next ? target.nextSibling : target);
      }
    });

    li.addEventListener('drop', (e) => {
      e.preventDefault();
      const newOrderIds = Array.from(itemsList.querySelectorAll('.task-item')).map(el => el.dataset.id);
      const reorderedItems = [];
      newOrderIds.forEach(id => {
        const found = items.find(i => i.id === id);
        if (found) reorderedItems.push(found);
      });
      items.forEach(i => {
        if (!reorderedItems.includes(i)) reorderedItems.push(i);
      });
      items = reorderedItems;
      saveItemsToStorage();
    });
  });
}

// ==========================================
// STOPWATCH MODULE (Part 1 from PDF)
// ==========================================
let swInterval = null;
let swStartTime = 0;
let swElapsedTime = 0;
let swLaps = [];

function initStopwatch() {
  function formatStopwatch(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    const milliseconds = ms % 1000;

    const pad = (n, len = 2) => String(n).padStart(len, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(milliseconds, 3)}`;
  }

  function updateSwDisplay() {
    swDisplay.textContent = formatStopwatch(swElapsedTime);
  }

  swStartBtn.addEventListener('click', () => {
    swStartTime = Date.now() - swElapsedTime;
    swInterval = setInterval(() => {
      swElapsedTime = Date.now() - swStartTime;
      updateSwDisplay();
    }, 10);

    swStartBtn.disabled = true;
    swStopBtn.disabled = false;
    swLapBtn.disabled = false;
  });

  swStopBtn.addEventListener('click', () => {
    clearInterval(swInterval);
    swStartBtn.disabled = false;
    swStopBtn.disabled = true;
    swLapBtn.disabled = true;
  });

  swLapBtn.addEventListener('click', () => {
    swLaps.unshift(formatStopwatch(swElapsedTime));
    renderSwLaps();
  });

  swResetBtn.addEventListener('click', () => {
    clearInterval(swInterval);
    swElapsedTime = 0;
    swLaps = [];
    updateSwDisplay();
    renderSwLaps();
    swStartBtn.disabled = false;
    swStopBtn.disabled = true;
    swLapBtn.disabled = true;
  });

  function renderSwLaps() {
    if (swLaps.length === 0) {
      swLapsWrapper.classList.add('hidden');
      swLapsList.innerHTML = '';
      return;
    }
    swLapsWrapper.classList.remove('hidden');
    swLapsList.innerHTML = swLaps.map((lap, idx) => `
      <li class="lap-item">
        <span>Lap ${swLaps.length - idx}</span>
        <strong>${lap}</strong>
      </li>
    `).join('');
  }
}

// ==========================================
// COUNTDOWN TIMER MODULE (Part 2 from PDF)
// ==========================================
let tmInterval = null;
let tmTimeLeftMs = 0;

function initTimer() {
  function formatTimer(ms) {
    if (ms < 0) ms = 0;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  function updateTmDisplay() {
    tmDisplay.textContent = formatTimer(tmTimeLeftMs);
  }

  tmStartBtn.addEventListener('click', () => {
    if (tmTimeLeftMs <= 0) {
      const inputSec = parseInt(tmInputSeconds.value, 10);
      if (isNaN(inputSec) || inputSec <= 0) {
        showToast('Please enter a valid time in seconds', 'warning');
        return;
      }
      tmTimeLeftMs = inputSec * 1000;
    }

    updateTmDisplay();
    tmStartBtn.disabled = true;
    tmStopBtn.disabled = false;

    tmInterval = setInterval(() => {
      tmTimeLeftMs -= 1000;
      updateTmDisplay();

      if (tmTimeLeftMs <= 0) {
        clearInterval(tmInterval);
        tmStartBtn.disabled = false;
        tmStopBtn.disabled = true;
        showToast("⏰ Time's up!", 'warning');
        alert("Time's up!");
      }
    }, 1000);
  });

  tmStopBtn.addEventListener('click', () => {
    clearInterval(tmInterval);
    tmStartBtn.disabled = false;
    tmStopBtn.disabled = true;
  });

  tmResetBtn.addEventListener('click', () => {
    clearInterval(tmInterval);
    tmTimeLeftMs = 0;
    tmInputSeconds.value = '';
    updateTmDisplay();
    tmStartBtn.disabled = false;
    tmStopBtn.disabled = true;
  });

  tmPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = parseInt(btn.dataset.sec, 10);
      tmInputSeconds.value = sec;
      tmTimeLeftMs = sec * 1000;
      updateTmDisplay();
    });
  });
}

// ==========================================
// ALARM CLOCK MODULE (Part 3 from PDF)
// ==========================================
let alarmInterval = null;
let targetAlarmTimeStr = '';

function initAlarmClock() {
  function pad(n) { return String(n).padStart(2, '0'); }

  function updateClock() {
    const now = new Date();
    const currentTimeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    alarmClockDisplay.textContent = currentTimeStr;

    if (targetAlarmTimeStr) {
      // Input value is HH:MM or HH:MM:SS
      const fullTarget = targetAlarmTimeStr.length === 5 ? `${targetAlarmTimeStr}:00` : targetAlarmTimeStr;
      if (currentTimeStr === fullTarget) {
        showToast('🔔 Wake up! Alarm is ringing!', 'warning');
        alert('Wake up! Alarm is ringing.');
        clearAlarm();
      }
    }
  }

  alarmInterval = setInterval(updateClock, 1000);
  updateClock();

  setAlarmBtn.addEventListener('click', () => {
    const val = alarmTimeInput.value;
    if (!val) {
      showToast('Please select a valid alarm time', 'warning');
      return;
    }

    targetAlarmTimeStr = val;
    alarmTargetText.textContent = targetAlarmTimeStr;
    alarmStatusBadge.classList.remove('hidden');
    setAlarmBtn.disabled = true;
    clearAlarmBtn.disabled = false;
    showToast(`Alarm set for ${targetAlarmTimeStr}`, 'info');
  });

  clearAlarmBtn.addEventListener('click', clearAlarm);

  function clearAlarm() {
    targetAlarmTimeStr = '';
    alarmTimeInput.value = '';
    alarmStatusBadge.classList.add('hidden');
    setAlarmBtn.disabled = false;
    clearAlarmBtn.disabled = true;
    showToast('Alarm cleared', 'info');
  }
}

// Event Listeners Registration
function attachEventListeners() {
  // Main Nav Tabs Listener (Part 4 requirement)
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });

  form.addEventListener('submit', addItem);
  sortBtn.addEventListener('click', sortItems);
  clearCompletedBtn.addEventListener('click', clearCompleted);
  themeToggle.addEventListener('click', toggleTheme);

  // File Storage buttons
  saveFileBtn.addEventListener('click', saveToTextFile);
  openFileBtn.addEventListener('click', openTextFile);
  fileInput.addEventListener('change', handleFileInputChange);

  // Search
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    clearSearchBtn.classList.toggle('hidden', searchQuery.length === 0);
    renderItems();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    renderItems();
  });

  // Filter Tabs
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      currentFilter = tab.dataset.filter;
      renderItems();
    });
  });

  // Delegated Task item events
  itemsList.addEventListener('click', (e) => {
    const taskItem = e.target.closest('.task-item');
    if (!taskItem) return;
    const itemId = taskItem.dataset.id;

    if (e.target.closest('.delete-btn')) {
      items = items.filter(i => i.id !== itemId);
      saveItemsToStorage();
      render();
      showToast('Task deleted', 'info');
    } else if (e.target.closest('.edit-btn')) {
      startEditing(taskItem, itemId);
    }
  });

  itemsList.addEventListener('dblclick', (e) => {
    const taskItem = e.target.closest('.task-item');
    if (taskItem && !e.target.closest('.task-checkbox') && !e.target.closest('.task-actions')) {
      startEditing(taskItem, taskItem.dataset.id);
    }
  });

  itemsList.addEventListener('change', (e) => {
    if (e.target.classList.contains('task-checkbox')) {
      const taskItem = e.target.closest('.task-item');
      if (!taskItem) return;
      const item = items.find(i => i.id === taskItem.dataset.id);
      if (item) {
        item.done = e.target.checked;
        saveItemsToStorage();
        render();
      }
    }
  });
}

// Run App
document.addEventListener('DOMContentLoaded', init);
