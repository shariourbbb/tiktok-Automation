const { Router } = require('express');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');

const router = Router();
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/', async (req, res) => {
  try {
    const files = await fs.readdir(UPLOAD_DIR);
    const images = files
      .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
      .map(f => ({
        name: f,
        url: `/uploads/${f}`,
        size: fs.statSync(path.join(UPLOAD_DIR, f)).size,
        uploadedAt: fs.statSync(path.join(UPLOAD_DIR, f)).birthtime,
      }))
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    req.io.emit('images:updated');
    res.json({
      name: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/upload-multiple', upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    req.io.emit('images:updated');
    const result = req.files.map(f => ({
      name: f.filename,
      url: `/uploads/${f.filename}`,
      size: f.size,
      uploadedAt: new Date().toISOString(),
    }));
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:name', async (req, res) => {
  try {
    const fp = path.join(UPLOAD_DIR, req.params.name);
    if (await fs.pathExists(fp)) {
      await fs.remove(fp);
    }
    req.io.emit('images:updated');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
