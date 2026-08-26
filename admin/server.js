const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');

const accountsRouter = require('./routes/accounts');
const keywordsRouter = require('./routes/keywords');
const imagesRouter = require('./routes/images');
const schedulerRouter = require('./routes/scheduler');
const botRouter = require('./routes/bot');
const analyticsRouter = require('./routes/analytics');
const leadsRouter = require('./routes/leads');
const campaignsRouter = require('./routes/campaigns');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.ADMIN_PORT || 3456;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'client', 'dist')));

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api/accounts', accountsRouter);
app.use('/api/keywords', keywordsRouter);
app.use('/api/images', imagesRouter);
app.use('/api/scheduler', schedulerRouter);
app.use('/api/bot', botRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/campaigns', campaignsRouter);

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

async function ensureDataFiles() {
  const dataDir = path.join(__dirname, 'data');
  await fs.ensureDir(dataDir);

  const defaults = {
    'accounts.json': [],
    'keywords.json': ['trending dance', '#viral', 'funny pets'],
    'schedules.json': [],
    'config.json': {
      headless: false,
      cooldownBetweenAccounts: { min: 300000, max: 600000 },
      cooldownBetweenVideos: { min: 30000, max: 90000 },
      typingDelay: { min: 50, max: 150 },
      maxVideosPerKeyword: 20,
    },
  };

  for (const [file, data] of Object.entries(defaults)) {
    const fp = path.join(dataDir, file);
    if (!(await fs.pathExists(fp))) {
      await fs.writeJson(fp, data, { spaces: 2 });
    }
  }
}

ensureDataFiles().then(() => {
  server.listen(PORT, () => {
    console.log(`[Admin] Server running on http://localhost:${PORT}`);
  });
});
