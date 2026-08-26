const { Router } = require('express');
const lm = require('../../leadsManager');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const leads = await lm.getLeads(req.query);
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await lm.getLeadStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const data = await lm.exportLeads(format, req.query);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
    }
    res.send(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const lead = await lm.addLead(req.body);
    req.io.emit('leads:updated');
    res.status(201).json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const lead = await lm.updateLead(req.params.id, req.body);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    req.io.emit('leads:updated');
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/interact', async (req, res) => {
  try {
    const lead = await lm.addInteraction(req.params.id, req.body);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    req.io.emit('leads:updated');
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await lm.deleteLead(req.params.id);
    req.io.emit('leads:updated');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bulk', async (req, res) => {
  try {
    const { action, ids, data } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required' });
    }
    const results = [];
    for (const id of ids) {
      if (action === 'delete') {
        await lm.deleteLead(id);
        results.push({ id, deleted: true });
      } else if (action === 'update') {
        const lead = await lm.updateLead(id, data || {});
        results.push(lead);
      }
    }
    req.io.emit('leads:updated');
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
