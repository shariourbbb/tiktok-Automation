const { Router } = require('express');
const path = require('path');
const fs = require('fs-extra');

const router = Router();
const DATA_FILE = path.join(__dirname, '..', 'data', 'keywords.json');

async function getKeywords() {
  return fs.readJson(DATA_FILE);
}

async function saveKeywords(keywords) {
  await fs.writeJson(DATA_FILE, keywords, { spaces: 2 });
}

router.get('/', async (req, res) => {
  try {
    const keywords = await getKeywords();
    res.json(keywords);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ error: 'keyword is required' });
    const keywords = await getKeywords();
    if (keywords.includes(keyword)) {
      return res.status(409).json({ error: 'Keyword already exists' });
    }
    keywords.push(keyword);
    await saveKeywords(keywords);
    req.io.emit('keywords:updated', keywords);
    res.status(201).json(keywords);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:keyword', async (req, res) => {
  try {
    const kw = decodeURIComponent(req.params.keyword);
    let keywords = await getKeywords();
    keywords = keywords.filter(k => k !== kw);
    await saveKeywords(keywords);
    req.io.emit('keywords:updated', keywords);
    res.json(keywords);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const { keywords } = req.body;
    if (!Array.isArray(keywords)) {
      return res.status(400).json({ error: 'keywords must be an array' });
    }
    await saveKeywords(keywords);
    req.io.emit('keywords:updated', keywords);
    res.json(keywords);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
