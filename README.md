# TaskManager

A beautifully designed, zero-dependency task manager built with pure HTML, CSS, and JavaScript. Organize your day with daily sessions, priority tagging, smart filtering, and a polished UI that works great on both desktop and mobile.

---

##  Features

- **Daily Sessions** — Every day gets its own session. Browse past sessions, switch between them, or delete ones you no longer need.
- **Task Management** — Add, edit, delete, and complete tasks with smooth animations and instant feedback.
- **Priority Levels** — Tag tasks as High 🔴, Medium 🟡, or Low 🟢 priority with color-coded indicators.
- **Categories** — Organize tasks under Work, Personal, Health, Finance, Learning, or Other.
- **Deadlines** — Set due dates; overdue tasks are automatically flagged with a warning.
- **Notes** — Attach extra context or links to any task.
- **Smart Filtering** — Filter tasks by All / Active / Done / Overdue.
- **Search & Sort** — Search by title, notes, or category. Sort by Latest, Priority, Deadline, or A→Z.
- **Progress Tracking** — A live progress bar and stats strip show Total / Active / Done counts per session.
- **Light & Dark Mode** — Full theme support with persistent preference saved to localStorage.
- **No Backend, No Dependencies** — Everything runs in the browser. Data is saved to `localStorage`.

---

##  Design Highlights

- Animated splash/landing screen with a hand-drawn doodle aesthetic
- Canvas-based floating particle background (ambient dots + landing shapes)
- Click burst animation — rings and particles fire on every button click
- Confetti effect when a task is completed 
- Smooth slide-up modal for task creation and editing
- Toast notifications for all actions
- Fully responsive — optimized for screens down to 360px wide

---

##  Live Demo
<a href="https://taskmanager-olive-alpha.vercel.app/" target="_blank">
  Visit Task Manager
</a>



##  Project Structure

```
taskmanager/
├── index.html     # App shell, HTML structure
├── style.css      # All styles, themes, animations, responsive rules
└── script.js      # All logic — sessions, tasks, rendering, canvas effects
```

---

##  Getting Started

No build step. No npm install. Just open the file.

```bash
# Clone the repo
git clone https://github.com/eshmalarshad/TaskManager

# Open in browser
cd TaskManager
open index.html
```

Or simply drag `index.html` into any browser.

---

##  Data Storage

All data is stored in the browser's `localStorage` under these keys:

| Key | Contents |
|-----|----------|
| `taskmaster_v3_tasks` | Array of all tasks |
| `taskmaster_v3_sessions` | Array of daily sessions |
| `taskmaster_v3_theme` | User's theme preference (`light` / `dark`) |

Clearing browser storage or using incognito mode will reset the app.

---

##  Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | Open "Add Task" modal |
| `Esc` | Close modal |

---

##  Tech Stack

| Layer | Technology |
|-------|-----------|
| Markup | HTML5 |
| Styles | CSS3 (Custom Properties, Grid, Flexbox, Animations) |
| Logic |  JavaScript (ES6+) |
| Fonts | [Syne](https://fonts.google.com/specimen/Syne), [DM Sans](https://fonts.google.com/specimen/DM+Sans), [Fredoka One](https://fonts.google.com/specimen/Fredoka+One), [Nunito](https://fonts.google.com/specimen/Nunito) via Google Fonts |
| Storage | Browser `localStorage` |
| Canvas | HTML5 Canvas API (background effects) |

---

##  Preview

| Light Mode | Dark Mode |
|-----------|-----------|
| Clean warm tones with amber accent | Deep dark background with golden highlights |

---

