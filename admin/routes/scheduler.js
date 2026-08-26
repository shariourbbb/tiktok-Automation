const { Router } = require('express');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');

const router = Router();
const DATA_FILE = path.join(__dirname, '..', 'data', 'schedules.json');

const runningJobs = {};

async function getSchedules() {
  return fs.readJson(DATA_FILE);
}

async function saveSchedules(schedules) {
  await fs.writeJson(DATA_FILE, schedules, { spaces: 2 });
}

function startCronJob(schedule, io) {
  if (!schedule.enabled) return;
  const job = cron.schedule(schedule.cron, () => {
    console.log(`[Scheduler] Triggering job: ${schedule.name}`);
    io.emit('scheduler:triggered', schedule);
  }, { scheduled: true });
  runningJobs[schedule.id] = job;
}

function stopCronJob(id) {
  if (runningJobs[id]) {
    runningJobs[id].stop();
    delete runningJobs[id];
  }
}

router.get('/', async (req, res) => {
  try {
    const schedules = await getSchedules();
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, cron: cronExpr, keywords, accounts, enabled } = req.body;
    if (!name || !cronExpr) {
      return res.status(400).json({ error: 'name and cron expression are required' });
    }
    if (!cron.validate(cronExpr)) {
      return res.status(400).json({ error: 'Invalid cron expression' });
    }
    const schedules = await getSchedules();
    const schedule = {
      id: uuidv4(),
      name,
      cron: cronExpr,
      keywords: keywords || [],
      accounts: accounts || [],
      enabled: enabled !== false,
      createdAt: new Date().toISOString(),
      lastRun: null,
    };
    schedules.push(schedule);
    await saveSchedules(schedules);
    if (schedule.enabled) startCronJob(schedule, req.io);
    req.io.emit('schedules:updated', schedules);
    res.status(201).json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const schedules = await getSchedules();
    const idx = schedules.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Schedule not found' });
    stopCronJob(req.params.id);
    schedules[idx] = { ...schedules[idx], ...req.body };
    if (schedules[idx].enabled) startCronJob(schedules[idx], req.io);
    await saveSchedules(schedules);
    req.io.emit('schedules:updated', schedules);
    res.json(schedules[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    stopCronJob(req.params.id);
    let schedules = await getSchedules();
    schedules = schedules.filter(s => s.id !== req.params.id);
    await saveSchedules(schedules);
    req.io.emit('schedules:updated', schedules);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/toggle', async (req, res) => {
  try {
    const schedules = await getSchedules();
    const idx = schedules.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Schedule not found' });
    schedules[idx].enabled = !schedules[idx].enabled;
    if (schedules[idx].enabled) {
      startCronJob(schedules[idx], req.io);
    } else {
      stopCronJob(req.params.id);
    }
    await saveSchedules(schedules);
    req.io.emit('schedules:updated', schedules);
    res.json(schedules[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
