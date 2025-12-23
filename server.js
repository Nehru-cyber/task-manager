const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const initSqlJs = require('sql.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Production configurations
if (NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Database
let db;
const DB_PATH = path.join(__dirname, 'data', 'tasks.db');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// =====================================================
// Password Utilities
// =====================================================

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

function generateUserId() {
  return 'user_' + crypto.randomBytes(8).toString('hex');
}

// =====================================================
// Database Initialization
// =====================================================

async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Try to load existing database
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('📂 Loaded existing database');
  } else {
    db = new SQL.Database();
    console.log('📂 Created new database');
  }
  
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in-progress', 'completed')),
      due_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  
  saveDatabase();
  console.log('✅ Database initialized successfully');
}

function saveDatabase() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// =====================================================
// Authentication Routes
// =====================================================

// Register new user
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if user already exists
    const checkStmt = db.prepare('SELECT * FROM users WHERE email = ?');
    checkStmt.bind([email.toLowerCase()]);
    if (checkStmt.step()) {
      checkStmt.free();
      return res.status(400).json({ error: 'An account with this email already exists' });
    }
    checkStmt.free();
    
    // Create new user
    const userId = generateUserId();
    const { salt, hash } = hashPassword(password);
    const name = displayName || email.split('@')[0];
    
    db.run(`
      INSERT INTO users (user_id, email, display_name, password_hash, password_salt)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, email.toLowerCase(), name, hash, salt]);
    
    saveDatabase();
    
    console.log(`✅ New user registered: ${email}`);
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        uid: userId,
        email: email.toLowerCase(),
        displayName: name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// Login user
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    stmt.bind([email.toLowerCase()]);
    
    if (!stmt.step()) {
      stmt.free();
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = stmt.getAsObject();
    stmt.free();
    
    // Verify password
    if (!verifyPassword(password, user.password_salt, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    console.log(`✅ User logged in: ${email}`);
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        uid: user.user_id,
        email: user.email,
        displayName: user.display_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Get user profile
app.get('/api/auth/profile/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    const stmt = db.prepare('SELECT user_id, email, display_name, created_at FROM users WHERE user_id = ?');
    stmt.bind([userId]);
    
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = stmt.getAsObject();
    stmt.free();
    
    res.json({
      uid: user.user_id,
      email: user.email,
      displayName: user.display_name,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// =====================================================
// Task Routes - CRUD Operations
// =====================================================

// Get all tasks for a user
app.get('/api/tasks/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { status, priority, search } = req.query;
    
    let query = 'SELECT * FROM tasks WHERE user_id = ?';
    const params = [userId];
    
    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (priority && priority !== 'all') {
      query += ' AND priority = ?';
      params.push(priority);
    }
    
    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const stmt = db.prepare(query);
    stmt.bind(params);
    
    const tasks = [];
    while (stmt.step()) {
      tasks.push(stmt.getAsObject());
    }
    stmt.free();
    
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get single task
app.get('/api/tasks/:userId/:taskId', (req, res) => {
  try {
    const { userId, taskId } = req.params;
    
    const stmt = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?');
    stmt.bind([taskId, userId]);
    
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = stmt.getAsObject();
    stmt.free();
    
    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create task
app.post('/api/tasks', (req, res) => {
  try {
    const { user_id, title, description, priority, status, due_date } = req.body;
    
    // Validation
    if (!user_id || !title) {
      return res.status(400).json({ error: 'User ID and title are required' });
    }
    
    if (title.trim().length === 0) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
    
    db.run(`
      INSERT INTO tasks (user_id, title, description, priority, status, due_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      user_id, 
      title.trim(), 
      description || '', 
      priority || 'medium', 
      status || 'pending', 
      due_date || null
    ]);
    
    saveDatabase();
    
    // Get the inserted task
    const stmt = db.prepare('SELECT * FROM tasks WHERE rowid = last_insert_rowid()');
    stmt.step();
    const newTask = stmt.getAsObject();
    stmt.free();
    
    console.log(`✅ Task created: "${title}" for user ${user_id}`);
    
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
app.put('/api/tasks/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, priority, status, due_date } = req.body;
    
    // Check if task exists
    const checkStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
    checkStmt.bind([taskId]);
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({ error: 'Task not found' });
    }
    checkStmt.free();
    
    // Validation
    if (title && title.trim().length === 0) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
    
    db.run(`
      UPDATE tasks 
      SET title = ?, description = ?, priority = ?, status = ?, due_date = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [title, description || '', priority, status, due_date || null, taskId]);
    
    saveDatabase();
    
    // Get the updated task
    const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
    stmt.bind([taskId]);
    stmt.step();
    const updatedTask = stmt.getAsObject();
    stmt.free();
    
    console.log(`✅ Task updated: ID ${taskId}`);
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
app.delete('/api/tasks/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    
    // Check if task exists
    const checkStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
    checkStmt.bind([taskId]);
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({ error: 'Task not found' });
    }
    checkStmt.free();
    
    db.run('DELETE FROM tasks WHERE id = ?', [taskId]);
    saveDatabase();
    
    console.log(`✅ Task deleted: ID ${taskId}`);
    
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// =====================================================
// Statistics Routes
// =====================================================

app.get('/api/stats/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    const getCount = (sql, params) => {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      stmt.step();
      const result = stmt.getAsObject();
      stmt.free();
      return result['COUNT(*)'] || 0;
    };
    
    const total = getCount('SELECT COUNT(*) FROM tasks WHERE user_id = ?', [userId]);
    const completed = getCount('SELECT COUNT(*) FROM tasks WHERE user_id = ? AND status = ?', [userId, 'completed']);
    const pending = getCount('SELECT COUNT(*) FROM tasks WHERE user_id = ? AND status = ?', [userId, 'pending']);
    const inProgress = getCount('SELECT COUNT(*) FROM tasks WHERE user_id = ? AND status = ?', [userId, 'in-progress']);
    
    res.json({
      total,
      completed,
      pending,
      inProgress,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// =====================================================
// Health Check Route
// =====================================================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// =====================================================
// Serve Frontend
// =====================================================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =====================================================
// Error Handling Middleware
// =====================================================

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// =====================================================
// Start Server
// =====================================================

async function startServer() {
  try {
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🚀 TaskFlow - Task Manager Application                     ║
║                                                              ║
║   Server running at: http://localhost:${PORT}                  ║
║   Environment: ${NODE_ENV.padEnd(43)}║
║                                                              ║
║   📝 Open your browser to start managing tasks!              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  if (db) {
    saveDatabase();
    db.close();
  }
  process.exit(0);
});

startServer();

module.exports = app;
