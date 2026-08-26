const { Router } = require('express');
const path = require('path');
const fs = require('fs-extra');

const router = Router();
const LOGS_FILE = path.join(__dirname, '..', 'data', 'analytics.json');

async function getAnalytics() {
  try {
    return await fs.readJson(LOGS_FILE);
  } catch {
    return { totalComments: 0, totalVideos: 0, commentsPerDay: {}, accounts: {} };
  }
}

async function saveAnalytics(data) {
  await fs.writeJson(LOGS_FILE, data, { spaces: 2 });
}

router.get('/', async (req, res) => {
  try {
    const data = await getAnalytics();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/record', async (req, res) => {
  try {
    const { accountId, videoUrl, comment } = req.body;
    const data = await getAnalytics();
    data.totalComments++;
    const today = new Date().toISOString().split('T')[0];
    data.commentsPerDay[today] = (data.commentsPerDay[today] || 0) + 1;
    if (!data.accounts[accountId]) {
      data.accounts[accountId] = { comments: 0, videos: {} };
    }
    data.accounts[accountId].comments++;
    data.accounts[accountId].videos[videoUrl] = (data.accounts[accountId].videos[videoUrl] || 0) + 1;
    await saveAnalytics(data);
    req.io.emit('analytics:updated', data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    await saveAnalytics({ totalComments: 0, totalVideos: 0, commentsPerDay: {}, accounts: {} });
    req.io.emit('analytics:updated', { totalComments: 0, totalVideos: 0, commentsPerDay: {}, accounts: {} });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
