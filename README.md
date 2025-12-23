# TaskFlow - Task Manager Application

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-v14+-green?style=for-the-badge&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/Express.js-4.x-blue?style=for-the-badge&logo=express" alt="Express.js">
  <img src="https://img.shields.io/badge/SQLite-3-lightblue?style=for-the-badge&logo=sqlite" alt="SQLite">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License">
</div>

<br/>

<div align="center">
  <h3>A modern, full-stack task management application with user authentication and CRUD features.</h3>
</div>

---

## 🚀 One-Click Deploy

Deploy your own TaskFlow instance with one click:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/taskflow?referralCode=taskflow)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/taskflow)

---

## ✨ Features

### User Authentication
- 🔐 Secure user registration and login
- 🔑 Password hashing with PBKDF2 (SHA-512)
- 💾 Persistent sessions with localStorage
- 👤 User profiles with avatars

### Task Management
- ✅ Create, read, update, and delete tasks
- 📝 Task titles and descriptions
- 🎯 Priority levels (Low, Medium, High)
- 📊 Status tracking (Pending, In Progress, Completed)
- 📅 Due date management with overdue detection

### Dashboard & Analytics
- 📈 Real-time task statistics
- 📊 Completion progress bar
- 🔢 Task counts by status
- 📉 Productivity insights

### User Experience
- 🌙 Modern dark theme interface
- 📱 Fully responsive design
- 🔍 Real-time search functionality
- 🔄 Advanced filtering and sorting
- 🎨 Smooth animations and transitions
- 🍞 Toast notifications

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v14 or higher
- npm (comes with Node.js)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/taskflow.git
   cd taskflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## 📁 Project Structure

```
taskflow/
├── public/                 # Static frontend files
│   ├── index.html         # Main HTML file
│   ├── styles.css         # CSS styles
│   └── app.js             # Frontend JavaScript
├── data/                   # Database storage (auto-created)
│   └── tasks.db           # SQLite database file
├── server.js              # Express server & API
├── package.json           # Project dependencies
├── Procfile               # Heroku/Railway deployment
├── railway.json           # Railway configuration
├── vercel.json            # Vercel configuration
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
└── README.md              # Documentation
```

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login user |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks/:userId` | Get all tasks for user |
| `POST` | `/api/tasks` | Create new task |
| `PUT` | `/api/tasks/:taskId` | Update task |
| `DELETE` | `/api/tasks/:taskId` | Delete task |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stats/:userId` | Get user statistics |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Check server status |

---

## 🛠️ Technologies Used

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **sql.js** - SQLite implementation in JavaScript
- **crypto** - Password hashing (built-in Node.js)
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variables

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS variables
- **Vanilla JavaScript** - No framework dependencies
- **Font Awesome** - Icons
- **Google Fonts (Inter)** - Typography

---

## 🔒 Security

- Passwords are hashed using PBKDF2 with SHA-512
- 256-bit random salt for each password
- 1,000 iterations for key derivation
- SQL injection prevention through parameterized queries
- Input validation on both frontend and backend
- Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)

---

## 🚀 Deployment

### Deploy to Railway (Recommended)

1. Click the **Deploy on Railway** button above, OR:
2. Install Railway CLI: `npm i -g @railway/cli`
3. Login: `railway login`
4. Initialize: `railway init`
5. Deploy: `railway up`

### Deploy to Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Deploy!

### Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts

### Deploy to Heroku

1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Deploy: `git push heroku main`

---

## 📄 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |

---

## 📄 License

MIT License - feel free to use this project for learning or building your own applications!

---

<div align="center">
  <p>⭐ Star this repository if you found it helpful!</p>
  <p>Made with ❤️ and JavaScript</p>
</div>
