const { Router } = require('express');
const lm = require('../../leadsManager');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const campaigns = await lm.loadCampaigns();
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const campaign = await lm.createCampaign(req.body);
    req.io.emit('campaigns:updated');
    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const campaign = await lm.updateCampaign(req.params.id, req.body);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    req.io.emit('campaigns:updated');
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await lm.deleteCampaign(req.params.id);
    req.io.emit('campaigns:updated');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
