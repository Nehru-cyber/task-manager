/**
 * TaskFlow - Task Manager Application
 * Frontend JavaScript
 * Version: 1.0.0
 */

// =====================================================
// Configuration & State
// =====================================================

const API_URL = '';
let currentUser = null;
let currentFilter = 'all';
let tasks = [];

// =====================================================
// Initialization
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  // Check for saved session
  const savedUser = localStorage.getItem('taskflow_user');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      updateUserInfo();
      showApp();
      loadTasks();
      loadStats();
    } catch (e) {
      localStorage.removeItem('taskflow_user');
      showAuth();
    }
  } else {
    showAuth();
  }
  
  // Setup event listeners
  setupEventListeners();
}

function setupEventListeners() {
  // Navigation clicks
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const filter = item.dataset.filter;
      filterByStatus(filter);
      
      // Close sidebar on mobile
      if (window.innerWidth < 1024) {
        closeSidebar();
      }
    });
  });
  
  // Close modals on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeDeleteModal();
    }
  });
  
  // Set minimum date for due date picker
  const today = new Date().toISOString().split('T')[0];
  const dueDateInput = document.getElementById('task-due-date');
  if (dueDateInput) {
    dueDateInput.setAttribute('min', today);
  }
  
  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.querySelector('.btn-menu');
    
    if (window.innerWidth < 1024 && 
        sidebar.classList.contains('open') && 
        !sidebar.contains(e.target) && 
        !menuBtn.contains(e.target)) {
      closeSidebar();
    }
  });
}

// =====================================================
// Authentication Functions
// =====================================================

async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  
  if (!email || !password) {
    showToast('Please fill in all fields', 'error');
    return;
  }
  
  showLoading();
  
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    // Save user session
    currentUser = data.user;
    localStorage.setItem('taskflow_user', JSON.stringify(currentUser));
    
    updateUserInfo();
    showApp();
    loadTasks();
    loadStats();
    
    showToast(`Welcome back, ${currentUser.displayName}!`, 'success');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    hideLoading();
  }
}

async function handleSignup(event) {
  event.preventDefault();
  
  const displayName = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  
  if (!displayName || !email || !password) {
    showToast('Please fill in all fields', 'error');
    return;
  }
  
  if (password.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }
  
  showLoading();
  
  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    
    // Save user session
    currentUser = data.user;
    localStorage.setItem('taskflow_user', JSON.stringify(currentUser));
    
    updateUserInfo();
    showApp();
    loadTasks();
    loadStats();
    
    showToast('Account created successfully! Welcome to TaskFlow!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    hideLoading();
  }
}

function handleLogout() {
  currentUser = null;
  tasks = [];
  localStorage.removeItem('taskflow_user');
  showAuth();
  
  // Reset forms
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('signup-name').value = '';
  document.getElementById('signup-email').value = '';
  document.getElementById('signup-password').value = '';
  
  showToast('Logged out successfully', 'info');
}

// =====================================================
// UI State Functions
// =====================================================

function showAuth() {
  document.getElementById('auth-container').classList.remove('hidden');
  document.getElementById('app-container').classList.add('hidden');
}

function showApp() {
  document.getElementById('auth-container').classList.add('hidden');
  document.getElementById('app-container').classList.remove('hidden');
}

function showLogin() {
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('signup-form').classList.add('hidden');
}

function showSignup() {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('signup-form').classList.remove('hidden');
}

function updateUserInfo() {
  if (currentUser) {
    document.getElementById('user-name').textContent = currentUser.displayName;
    document.getElementById('user-email').textContent = currentUser.email;
    document.getElementById('user-avatar').src = 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName)}&background=6366f1&color=fff&size=80`;
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.remove('open');
}

function showLoading() {
  document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}

// =====================================================
// Task CRUD Operations
// =====================================================

async function loadTasks() {
  if (!currentUser) return;
  
  const container = document.getElementById('tasks-container');
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  try {
    const params = new URLSearchParams();
    
    if (currentFilter && currentFilter !== 'all') {
      params.append('status', currentFilter);
    }
    
    const priorityFilter = document.getElementById('priority-filter').value;
    if (priorityFilter && priorityFilter !== 'all') {
      params.append('priority', priorityFilter);
    }
    
    const url = `${API_URL}/api/tasks/${currentUser.uid}${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch tasks');
    }
    
    tasks = await response.json();
    renderTasks();
  } catch (error) {
    console.error('Error loading tasks:', error);
    container.innerHTML = '<p class="error" style="text-align: center; padding: 40px; color: var(--danger);">Failed to load tasks. Please try again.</p>';
  }
}

function renderTasks() {
  const container = document.getElementById('tasks-container');
  const emptyState = document.getElementById('empty-state');
  
  if (tasks.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    emptyState.querySelector('h3').textContent = currentFilter === 'all' ? 'No tasks yet' : `No ${currentFilter.replace('-', ' ')} tasks`;
    emptyState.querySelector('p').textContent = currentFilter === 'all' ? 'Start by creating your first task!' : 'Tasks with this status will appear here.';
    return;
  }
  
  emptyState.classList.add('hidden');
  
  // Sort tasks
  const sortValue = document.getElementById('sort-filter').value;
  const sortedTasks = sortTasksBy([...tasks], sortValue);
  
  container.innerHTML = sortedTasks.map(task => createTaskCard(task)).join('');
}

function createTaskCard(task) {
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = dueDate && dueDate < today && task.status !== 'completed';
  
  return `
    <div class="task-card priority-${task.priority} status-${task.status}" data-id="${task.id}">
      <div class="task-header">
        <div class="task-content">
          <h3 class="task-title">${escapeHtml(task.title)}</h3>
          ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
        </div>
        <div class="task-actions">
          ${task.status !== 'completed' ? `
            <button class="btn-complete" onclick="toggleTaskComplete(${task.id})" title="Mark as complete">
              <i class="fas fa-check"></i>
            </button>
          ` : `
            <button class="btn-complete" onclick="toggleTaskIncomplete(${task.id})" title="Mark as incomplete">
              <i class="fas fa-undo"></i>
            </button>
          `}
          <button class="btn-edit" onclick="editTask(${task.id})" title="Edit task">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-delete" onclick="confirmDelete(${task.id})" title="Delete task">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="task-meta">
        <span class="task-badge badge-priority ${task.priority}">
          <i class="fas fa-flag"></i> ${capitalizeFirst(task.priority)}
        </span>
        <span class="task-badge badge-status ${task.status}">
          ${getStatusIcon(task.status)} ${formatStatus(task.status)}
        </span>
        ${dueDate ? `
          <span class="task-due-date ${isOverdue ? 'overdue' : ''}">
            <i class="fas fa-calendar${isOverdue ? '-times' : ''}"></i> 
            ${isOverdue ? 'Overdue: ' : ''}${formatDate(dueDate)}
          </span>
        ` : ''}
      </div>
    </div>
  `;
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  
  const taskId = document.getElementById('task-id').value;
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-description').value.trim();
  const priority = document.getElementById('task-priority').value;
  const status = document.getElementById('task-status').value;
  const dueDate = document.getElementById('task-due-date').value;
  
  if (!title) {
    showToast('Please enter a task title', 'error');
    return;
  }
  
  const taskData = {
    user_id: currentUser.uid,
    title,
    description,
    priority,
    status,
    due_date: dueDate || null
  };
  
  try {
    let response;
    
    if (taskId) {
      // Update existing task
      response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
    } else {
      // Create new task
      response = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
    }
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to save task');
    }
    
    closeModal();
    loadTasks();
    loadStats();
    
    showToast(taskId ? 'Task updated successfully!' : 'Task created successfully!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function editTask(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  
  document.getElementById('task-id').value = task.id;
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-description').value = task.description || '';
  document.getElementById('task-priority').value = task.priority;
  document.getElementById('task-status').value = task.status;
  document.getElementById('task-due-date').value = task.due_date || '';
  
  document.getElementById('modal-title').textContent = 'Edit Task';
  document.getElementById('submit-btn').innerHTML = '<i class="fas fa-save"></i> Update Task';
  
  openModal();
}

async function toggleTaskComplete(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  
  try {
    const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...task, status: 'completed' })
    });
    
    if (!response.ok) throw new Error('Failed to update task');
    
    loadTasks();
    loadStats();
    showToast('Task completed! 🎉', 'success');
  } catch (error) {
    showToast('Error updating task', 'error');
  }
}

async function toggleTaskIncomplete(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  
  try {
    const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...task, status: 'pending' })
    });
    
    if (!response.ok) throw new Error('Failed to update task');
    
    loadTasks();
    loadStats();
    showToast('Task marked as pending', 'info');
  } catch (error) {
    showToast('Error updating task', 'error');
  }
}

// Delete task
let taskToDelete = null;

function confirmDelete(taskId) {
  taskToDelete = taskId;
  document.getElementById('delete-modal').classList.remove('hidden');
  document.getElementById('confirm-delete-btn').onclick = deleteTask;
}

async function deleteTask() {
  if (!taskToDelete) return;
  
  try {
    const response = await fetch(`${API_URL}/api/tasks/${taskToDelete}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Failed to delete task');
    
    closeDeleteModal();
    loadTasks();
    loadStats();
    showToast('Task deleted', 'success');
  } catch (error) {
    showToast('Error deleting task', 'error');
  }
  
  taskToDelete = null;
}

function closeDeleteModal() {
  document.getElementById('delete-modal').classList.add('hidden');
  taskToDelete = null;
}

// =====================================================
// Filter & Search Functions
// =====================================================

function searchTasks() {
  const query = document.getElementById('search-input').value.toLowerCase().trim();
  
  if (!query) {
    renderTasks();
    return;
  }
  
  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(query) ||
    (task.description && task.description.toLowerCase().includes(query))
  );
  
  const container = document.getElementById('tasks-container');
  const emptyState = document.getElementById('empty-state');
  
  if (filteredTasks.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    emptyState.querySelector('h3').textContent = 'No matching tasks';
    emptyState.querySelector('p').textContent = 'Try a different search term';
    return;
  }
  
  emptyState.classList.add('hidden');
  container.innerHTML = filteredTasks.map(task => createTaskCard(task)).join('');
}

function filterByStatus(status) {
  currentFilter = status;
  
  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.filter === status) {
      item.classList.add('active');
    }
  });
  
  // Update page title
  const titles = {
    'all': 'All Tasks',
    'pending': 'Pending Tasks',
    'in-progress': 'In Progress',
    'completed': 'Completed Tasks'
  };
  document.getElementById('page-title').textContent = titles[status] || 'All Tasks';
  
  // Clear search
  document.getElementById('search-input').value = '';
  
  loadTasks();
}

function filterTasks() {
  loadTasks();
}

function sortTasks() {
  renderTasks();
}

function sortTasksBy(tasksArray, sortBy) {
  switch (sortBy) {
    case 'newest':
      return tasksArray.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    case 'oldest':
      return tasksArray.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    case 'priority':
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return tasksArray.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    case 'due-date':
      return tasksArray.sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });
    default:
      return tasksArray;
  }
}

// =====================================================
// Statistics
// =====================================================

async function loadStats() {
  if (!currentUser) return;
  
  try {
    const response = await fetch(`${API_URL}/api/stats/${currentUser.uid}`);
    
    if (!response.ok) throw new Error('Failed to fetch stats');
    
    const stats = await response.json();
    
    // Update stat values
    document.getElementById('total-tasks').textContent = stats.total;
    document.getElementById('completed-tasks').textContent = stats.completed;
    document.getElementById('progress-tasks').textContent = stats.inProgress;
    document.getElementById('pending-tasks').textContent = stats.pending;
    
    // Update nav badges
    document.getElementById('nav-all-count').textContent = stats.total;
    document.getElementById('nav-pending-count').textContent = stats.pending;
    document.getElementById('nav-progress-count').textContent = stats.inProgress;
    document.getElementById('nav-completed-count').textContent = stats.completed;
    
    // Update progress bar
    const completionRate = stats.completionRate || 0;
    document.getElementById('completion-progress').style.width = `${completionRate}%`;
    document.getElementById('completion-rate').textContent = completionRate;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// =====================================================
// Modal Functions
// =====================================================

function openModal() {
  document.getElementById('task-modal').classList.remove('hidden');
  document.getElementById('task-title').focus();
}

function closeModal() {
  document.getElementById('task-modal').classList.add('hidden');
  document.getElementById('task-form').reset();
  document.getElementById('task-id').value = '';
  document.getElementById('modal-title').textContent = 'Add New Task';
  document.getElementById('submit-btn').innerHTML = '<i class="fas fa-save"></i> Save Task';
}

// =====================================================
// Toast Notifications
// =====================================================

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const icon = toast.querySelector('.toast-icon');
  const messageEl = toast.querySelector('.toast-message');
  
  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };
  
  icon.className = `toast-icon ${icons[type] || icons.info}`;
  messageEl.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  
  // Auto hide after 4 seconds
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// =====================================================
// Utility Functions
// =====================================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatStatus(status) {
  if (!status) return '';
  return status.split('-').map(capitalizeFirst).join(' ');
}

function getStatusIcon(status) {
  const icons = {
    pending: '<i class="fas fa-clock"></i>',
    'in-progress': '<i class="fas fa-spinner fa-spin"></i>',
    completed: '<i class="fas fa-check"></i>'
  };
  return icons[status] || '';
}

function formatDate(date) {
  if (!date) return '';
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}
