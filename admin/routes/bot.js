const { Router } = require('express');
const { spawn } = require('child_process');
const path = require('path');

const router = Router();

const BOT_SCRIPT = path.join(__dirname, '..', '..', 'bot.js');
let botProcess = null;
let botRunning = false;
let botLogs = [];
const MAX_LOGS = 1000;

function addLog(level, message) {
  const entry = { level, message, timestamp: new Date().toISOString() };
  botLogs.push(entry);
  if (botLogs.length > MAX_LOGS) botLogs.splice(0, botLogs.length - MAX_LOGS);
  return entry;
}

router.get('/status', (req, res) => {
  res.json({ running: botRunning, pid: botProcess ? botProcess.pid : null });
});

router.post('/start', async (req, res) => {
  if (botRunning) {
    return res.status(409).json({ error: 'Bot is already running' });
  }
  try {
    botProcess = spawn('node', [BOT_SCRIPT], {
      cwd: path.join(__dirname, '..', '..'),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    botRunning = true;
    const entry = addLog('info', 'Bot process started');
    req.io.emit('bot:log', entry);

    botProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        const entry = addLog('info', line);
        req.io.emit('bot:log', entry);
      }
    });

    botProcess.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        const entry = addLog('error', line);
        req.io.emit('bot:log', entry);
      }
    });

    botProcess.on('close', (code) => {
      const entry = addLog('info', `Bot process exited with code ${code}`);
      req.io.emit('bot:log', entry);
      req.io.emit('bot:status', { running: false });
      botRunning = false;
      botProcess = null;
    });

    req.io.emit('bot:status', { running: true });
    res.json({ success: true, message: 'Bot started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/stop', (req, res) => {
  if (!botRunning || !botProcess) {
    return res.status(409).json({ error: 'Bot is not running' });
  }
  botProcess.kill('SIGTERM');
  setTimeout(() => {
    if (botProcess) {
      botProcess.kill('SIGKILL');
    }
  }, 5000);
  const entry = addLog('info', 'Bot process stopping...');
  req.io.emit('bot:log', entry);
  res.json({ success: true, message: 'Bot stopping' });
});

router.get('/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json(botLogs.slice(-limit));
});

router.delete('/logs', (req, res) => {
  botLogs = [];
  res.json({ success: true });
});

module.exports = router;
