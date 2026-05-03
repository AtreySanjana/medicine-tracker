# 💊 MedTracker

A personal medicine intake tracker that runs locally in your browser, with persistent storage via JSON files on disk.

## Features

- Track all your medications and doses per day
- Calendar navigation — click any date to view and log doses
- Add, edit, and delete medications with custom schedules
- Multi-phase support (e.g. Primolut N changes from TID → BD automatically)
- Missed dose detection with recovery guidance
- Export and import backups as a single JSON file
- Course summary — days remaining and tablets required for finite courses
- Persistent storage — all data saved to local JSON files
- Works fully offline (just needs Node.js)

---

## Setup

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v14 or later).

### 2. Install dependencies
Open a terminal in the project folder and run:

```bash
npm install
```

### 3. Start the app

**Option A — Simple start (terminal)**
```bash
npm start
```

**Option B — Batch file (Windows)**
Double-click `start_medtracker.bat` in the project folder.

**Option C — Background service with PM2 (recommended for daily use)**

Keeps the app running in the background and restarts it automatically if it crashes.

```bash
npm install -g pm2
pm2 start ecosystem.config.json
pm2 save
```

Or double-click `start_pm2.bat`.

Useful PM2 commands:
```bash
pm2 status              # Check if it's running
pm2 stop medtracker     # Stop the app
pm2 restart medtracker  # Restart after changes
pm2 logs medtracker     # View live logs
```

Once started, open **http://localhost:3000** in your browser.

> If port 3000 is already in use, set a different port:
> - **Windows PowerShell:** `$env:PORT=3001; npm start`
> - **macOS/Linux:** `PORT=3001 npm start`

---

## Data storage

All data is stored in the `data/` folder, which is created automatically on first run:

| File | Contents |
|------|----------|
| `data/medications.json` | Medication list, schedules, and phases |
| `data/logs.json` | Daily dose intake records |
| `data/missed_doses.json` | Missed dose records and recovery actions |

> **Important:** The `data/` folder is listed in `.gitignore` and will never be committed to version control. Your personal health data stays on your machine only.

---

## Backup and restore

The app includes built-in backup support accessible from the sidebar.

- **Export backup** — downloads a single `medtracker-backup.json` file containing medications, logs, and missed-dose records.
- **Import backup** — restores all data from a previously exported backup file.

Keep a copy of your backup file in a safe place (e.g. cloud storage) in case you need to move to a new machine.

---

## Usage guide

### Navigating dates
- Click any day in the **calendar** sidebar to view or log doses for that date
- Use the **arrow buttons** on the calendar to move between months
- Click **Jump to today** to return to the current date

### Logging doses
- Tap a dose button (Morning / Afternoon / Night) to mark it as taken — it turns green
- Tap again to unmark it
- The progress bar and stats update instantly

### Missed doses
- The app automatically detects any doses from past dates that were not marked as taken
- Each missed dose shows a suggested recovery action based on the medication type
- You can mark a missed dose as handled or carry it over to another date

### Adding a medication
1. Click **+ Add medication** in the sidebar
2. Enter the medicine name
3. Pick a colour
4. Select dose times (Morning / Afternoon / Night) and set start/end dates
5. Add additional phases if the schedule changes over time
6. Click **Save**

### Editing a medication
Click the ✏️ icon on any medication card to update its name, colour, phases, or dates.

### Deleting a medication
Click the 🗑️ icon and confirm. This permanently removes the medication and all its dose logs.

### Course summary
For medications with a defined end date, the app shows how many days remain and how many tablets are still required to complete the course.

---

## Project structure

```
Medicine Tracker/
├── index.html             # Frontend (single-page app)
├── server.js              # Express backend and REST API
├── package.json
├── package-lock.json
├── ecosystem.config.json  # PM2 configuration
├── start_medtracker.bat   # Windows quick-start (manual)
├── start_pm2.bat          # Windows quick-start (PM2)
├── .gitignore             # Excludes data/, node_modules/, logs/
├── README.md
└── data/                  # Auto-created, never committed
    ├── medications.json
    ├── logs.json
    └── missed_doses.json
```

---

## Opening in VS Code

- Backend entry point: `server.js`
- Frontend: `index.html`
