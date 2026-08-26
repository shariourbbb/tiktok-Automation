const { Router } = require('express');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const router = Router();
const DATA_FILE = path.join(__dirname, '..', 'data', 'accounts.json');

async function getAccounts() {
  return fs.readJson(DATA_FILE);
}

async function saveAccounts(accounts) {
  await fs.writeJson(DATA_FILE, accounts, { spaces: 2 });
}

router.get('/', async (req, res) => {
  try {
    const accounts = await getAccounts();
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id, username, proxy } = req.body;
    if (!id || !username) {
      return res.status(400).json({ error: 'id and username are required' });
    }
    const accounts = await getAccounts();
    if (accounts.find(a => a.id === id)) {
      return res.status(409).json({ error: 'Account ID already exists' });
    }
    const account = {
      id,
      username,
      proxy: proxy || '',
      status: 'active',
      sessionExists: false,
      createdAt: new Date().toISOString(),
    };
    accounts.push(account);
    await saveAccounts(accounts);
    req.io.emit('accounts:updated', accounts);
    res.status(201).json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const accounts = await getAccounts();
    const idx = accounts.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Account not found' });
    accounts[idx] = { ...accounts[idx], ...req.body };
    await saveAccounts(accounts);
    req.io.emit('accounts:updated', accounts);
    res.json(accounts[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    let accounts = await getAccounts();
    accounts = accounts.filter(a => a.id !== req.params.id);
    await saveAccounts(accounts);
    req.io.emit('accounts:updated', accounts);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
