const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const MEDS_FILE = path.join(DATA_DIR, 'medications.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const MISSED_DOSES_FILE = path.join(DATA_DIR, 'missed_doses.json');

app.use(express.json());

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DEFAULT_MEDS = [
  {
    id: 'primolut',
    name: 'Primolut N 5mg',
    color: '#EDE9FE',
    textColor: '#4C1D95',
    phases: [
      { times: ['Morning', 'Afternoon', 'Night'], start: '2026-04-23', end: '2026-04-29', note: 'TID phase — 3x daily until 29 Apr' },
      { times: ['Morning', 'Night'], start: '2026-04-30', end: '2026-05-13', note: 'BD phase — 2x daily until 13 May' }
    ]
  },
  {
    id: 'trapic',
    name: 'Trapic E',
    color: '#FEF3C7',
    textColor: '#92400E',
    phases: [
      { times: ['Morning', 'Night'], start: '2026-04-23', end: '2026-04-25', note: '' }
    ]
  },
  {
    id: 'arip',
    name: 'ARIP MT',
    color: '#FCE7F3',
    textColor: '#831843',
    phases: [
      { times: ['Night'], start: '2026-04-03', end: '2026-04-30', note: '' }
    ]
  },
  {
    id: 'ignicar',
    name: 'IGNICAR',
    color: '#DBEAFE',
    textColor: '#1E3A8A',
    phases: [
      { times: ['Night'], start: '2026-04-03', end: '2026-04-05', note: 'Initial 3-day period' },
      { times: ['Night'], start: '2026-04-14', end: '2026-05-08', note: 'Restart course — ends 8 May' }
    ]
  },
  {
    id: 'aldactone',
    name: 'Aldactone 100',
    color: '#D1FAE5',
    textColor: '#064E3B',
    phases: [
      { times: ['Morning', 'Night'], start: '2026-04-23', end: null, note: 'Ongoing' }
    ]
  },
  {
    id: 'metital',
    name: 'Metital',
    color: '#ECFDF5',
    textColor: '#065F46',
    phases: [
      { times: ['Night'], start: '2026-04-23', end: null, note: 'Ongoing' }
    ]
  },
  {
    id: 'reheptin',
    name: 'Reheptin UD300',
    color: '#F3F4F6',
    textColor: '#374151',
    phases: [
      { times: ['Night'], start: '2026-04-23', end: null, note: 'Ongoing' }
    ]
  }
];

function readJSON(file, defaultVal) {
  try {
    if (!fs.existsSync(file)) return defaultVal;
    const raw = fs.readFileSync(file, 'utf8');
    if (!raw) return defaultVal;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to read JSON from ${file}:`, e.message);
    return defaultVal;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function doseKey(date, medId, time, foodTiming = 'Any') {
  return `${date}__${medId}__${time}__${foodTiming || 'Any'}`;
}

function oldDoseKey(date, medId, time) {
  return `${date}__${medId}__${time}`;
}

function isDoseTaken(logs, date, medId, time, foodTiming = 'Any') {
  const key = doseKey(date, medId, time, foodTiming);
  if (logs[key] === true) return true;
  if (foodTiming === 'Any') {
    return logs[oldDoseKey(date, medId, time)] === true;
  }
  return false;
}

if (!fs.existsSync(MEDS_FILE)) writeJSON(MEDS_FILE, DEFAULT_MEDS);
if (!fs.existsSync(LOGS_FILE)) writeJSON(LOGS_FILE, {});
if (!fs.existsSync(MISSED_DOSES_FILE)) writeJSON(MISSED_DOSES_FILE, {});

// --- Medications API ---
app.get('/api/medications', (req, res) => {
  const meds = readJSON(MEDS_FILE, DEFAULT_MEDS);
  const today = new Date().toISOString().split('T')[0];

  // Add course information to each medication
  const medsWithCourseInfo = meds.map(med => {
    const courseInfo = calculateCourseInfo(med, today);
    return { archived: med.archived === true, ...med, ...courseInfo };
  });

  res.json(medsWithCourseInfo);
});

app.post('/api/medications', (req, res) => {
  const meds = readJSON(MEDS_FILE, DEFAULT_MEDS);
  const med = req.body;
  med.id = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `med_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  med.archived = false;
  meds.push(med);
  writeJSON(MEDS_FILE, meds);
  res.json(med);
});

app.put('/api/medications/:id', (req, res) => {
  const meds = readJSON(MEDS_FILE, DEFAULT_MEDS);
  const idx = meds.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  meds[idx] = { ...meds[idx], ...req.body, id: req.params.id };
  writeJSON(MEDS_FILE, meds);
  res.json(meds[idx]);
});

app.delete('/api/medications/:id', (req, res) => {
  let meds = readJSON(MEDS_FILE, DEFAULT_MEDS);
  meds = meds.filter(m => m.id !== req.params.id);
  writeJSON(MEDS_FILE, meds);

  const logs = readJSON(LOGS_FILE, {});
  const filteredLogs = Object.fromEntries(
    Object.entries(logs).filter(([key]) => !key.includes(`__${req.params.id}__`))
  );
  writeJSON(LOGS_FILE, filteredLogs);

  const missedDoses = readJSON(MISSED_DOSES_FILE, {});
  const filteredMissedDoses = Object.fromEntries(
    Object.entries(missedDoses).filter(([key]) => !key.includes(`__${req.params.id}__`))
  );
  writeJSON(MISSED_DOSES_FILE, filteredMissedDoses);

  res.json({ ok: true });
});

// --- Logs API ---
app.get('/api/logs', (req, res) => {
  res.json(readJSON(LOGS_FILE, {}));
});

app.post('/api/logs/toggle', (req, res) => {
  const { date, medId, time, foodTiming = 'Any' } = req.body;
  const logs = readJSON(LOGS_FILE, {});
  const key = doseKey(date, medId, time, foodTiming);
  logs[key] = !logs[key];
  writeJSON(LOGS_FILE, logs);
  res.json({ key, value: logs[key] });
});

// --- Missed Doses API ---
app.get('/api/missed-doses', (req, res) => {
  const missedDoses = readJSON(MISSED_DOSES_FILE, {});
  const medications = readJSON(MEDS_FILE, DEFAULT_MEDS);
  const logs = readJSON(LOGS_FILE, {});
  const today = new Date().toISOString().split('T')[0];

  // Detect missed doses for all past dates
  const detectedMissed = detectMissedDoses(medications, logs, today);
  const allMissed = { ...detectedMissed };

  Object.entries(missedDoses).forEach(([key, savedItem]) => {
    allMissed[key] = { ...allMissed[key], ...savedItem };
  });

  // Save any newly detected missed doses while preserving existing handled/carriedOver state
  if (Object.keys(detectedMissed).length > 0) {
    writeJSON(MISSED_DOSES_FILE, allMissed);
  }

  res.json(allMissed);
});

app.post('/api/missed-doses/mark-handled', (req, res) => {
  const { date, medId, time, foodTiming = 'Any' } = req.body;
  const missedDoses = readJSON(MISSED_DOSES_FILE, {});
  const key = doseKey(date, medId, time, foodTiming);

  if (missedDoses[key]) {
    missedDoses[key].handled = true;
    writeJSON(MISSED_DOSES_FILE, missedDoses);
  }

  res.json({ success: true });
});

app.post('/api/missed-doses/carry-over', (req, res) => {
  const { date, medId, time, foodTiming = 'Any', targetDate } = req.body;
  const missedDoses = readJSON(MISSED_DOSES_FILE, {});
  const logs = readJSON(LOGS_FILE, {});
  const key = doseKey(date, medId, time, foodTiming);

  if (missedDoses[key] && !missedDoses[key].handled) {
    // Mark the missed dose as carried over
    missedDoses[key].carriedOver = true;
    missedDoses[key].carriedOverTo = targetDate;
    missedDoses[key].handled = true;

    // Add the carried-over dose to the target date's schedule
    const carryOverKey = doseKey(targetDate, medId, time, foodTiming);
    if (!logs[carryOverKey]) {
      logs[carryOverKey] = false; // Mark as not taken yet, but scheduled due to carry-over
    }

    writeJSON(MISSED_DOSES_FILE, missedDoses);
    writeJSON(LOGS_FILE, logs);
  }

  res.json({ success: true });
});

app.get('/api/backup', (req, res) => {
  const backupData = {
    medications: readJSON(MEDS_FILE, DEFAULT_MEDS),
    logs: readJSON(LOGS_FILE, {}),
    missedDoses: readJSON(MISSED_DOSES_FILE, {})
  };
  res.setHeader('Content-Disposition', 'attachment; filename="medtracker-backup.json"');
  res.json(backupData);
});

app.post('/api/restore-backup', (req, res) => {
  const payload = req.body;
  if (!isValidBackup(payload)) {
    return res.status(400).json({ error: 'Invalid backup payload' });
  }

  writeJSON(MEDS_FILE, payload.medications);
  writeJSON(LOGS_FILE, payload.logs);
  writeJSON(MISSED_DOSES_FILE, payload.missedDoses);

  res.json({ success: true });
});

function isValidBackup(payload) {
  return (
    payload &&
    Array.isArray(payload.medications) &&
    payload.medications.every(m => typeof m === 'object' && m !== null) &&
    typeof payload.logs === 'object' && payload.logs !== null &&
    typeof payload.missedDoses === 'object' && payload.missedDoses !== null
  );
}

// Helper function to detect missed doses
function detectMissedDoses(medications, logs, today) {
  const missed = {};
  const todayDate = new Date(today);

  for (const med of medications) {
    for (const phase of med.phases) {
      const startDate = new Date(phase.start);
      const endDate = phase.end ? new Date(phase.end) : todayDate;

      // Only check dates up to yesterday
      const checkEndDate = new Date(todayDate);
      checkEndDate.setDate(checkEndDate.getDate() - 1);

      // Only check if this phase was active on or before yesterday
      if (startDate <= checkEndDate) {
        const phaseEndDate = endDate < checkEndDate ? endDate : checkEndDate;

        for (let date = new Date(Math.max(startDate, new Date('2026-01-01'))); date <= phaseEndDate; date.setDate(date.getDate() + 1)) {
          const dateStr = date.toISOString().split('T')[0];

          for (const time of phase.times) {
            const foodTiming = phase.foodTiming?.[time] || 'Any';
            const key = doseKey(dateStr, med.id, time, foodTiming);
            const wasTaken = isDoseTaken(logs, dateStr, med.id, time, foodTiming);

            if (wasTaken !== true) {
              // This dose was missed
              if (!missed[key]) {
                missed[key] = {
                  date: dateStr,
                  medId: med.id,
                  medName: med.name,
                  time: time,
                  foodTiming,
                  missedDate: dateStr,
                  handled: false,
                  recoveryAction: getRecoveryAction(med, phase, dateStr, time)
                };
              }
            }
          }
        }
      }
    }
  }

  return missed;
}

// Helper function to determine recovery action for missed doses
function getRecoveryAction(med, phase, missedDate, time) {
  const medName = med.name.toLowerCase();

  // Basic recovery logic - can be expanded based on medication type
  if (medName.includes('primolut') || medName.includes('hormone')) {
    return "Take the missed dose as soon as possible, then continue with next scheduled dose. Do not double dose.";
  } else if (medName.includes('antibiotic') || medName.includes('infection')) {
    return "Take the missed dose immediately if within 2 hours, otherwise wait for next dose. Complete full course.";
  } else if (medName.includes('blood pressure') || medName.includes('aldactone')) {
    return "Take the missed dose as soon as remembered, then continue normally. Monitor blood pressure.";
  } else if (medName.includes('diabetes') || medName.includes('metital')) {
    return "Take the missed dose immediately. Check blood sugar levels and consult healthcare provider if needed.";
  } else {
    return "Take the missed dose as soon as possible, then continue with regular schedule. Consult medication instructions or healthcare provider.";
  }
}

// Helper function to calculate course information
function calculateCourseInfo(med, today) {
  const todayDate = new Date(today);
  let totalTablets = 0;
  let daysLeft = 0;
  let hasEndDate = true;

  // Check if any phase has no end date
  for (const phase of med.phases) {
    if (!phase.end) {
      hasEndDate = false;
      break;
    }
  }

  if (!hasEndDate) {
    return {}; // Don't show course info for ongoing medications
  }

  // Calculate remaining course information from today onwards
  for (const phase of med.phases) {
    const startDate = new Date(phase.start);
    const endDate = new Date(phase.end);

    // Only consider phases that haven't ended yet
    if (endDate >= todayDate) {
      // Calculate the effective start date for this phase (max of phase start and today)
      const effectiveStart = startDate > todayDate ? startDate : todayDate;

      if (effectiveStart <= endDate) {
        // Calculate days in this phase from effective start
        const daysInPhase = Math.floor((endDate - effectiveStart) / (1000 * 60 * 60 * 24)) + 1;
        daysLeft += daysInPhase;

        // Calculate tablets for this phase
        const tabletsInPhase = daysInPhase * phase.times.length;
        totalTablets += tabletsInPhase;
      }
    }
  }

  return {
    daysLeft: Math.max(0, daysLeft),
    tabletsRequired: Math.max(0, totalTablets)
  };
}

const server = app.listen(PORT, () => {
  console.log(`\n💊 MedTracker running at http://localhost:${PORT}\n`);
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Set PORT to a free port or stop the process using the port.`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});
