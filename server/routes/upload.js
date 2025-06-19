const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// ✅ Use fetch via dynamic import
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Ensure uploads directory exists
const uploadPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);

// Configure multer for disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const jobData = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    uploadedAt: new Date().toISOString()
  };

  console.log('✅ Job data to enqueue:', jobData);

  try {
    // ✅ Push job data as a simple stringified object (not array)
    await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/lpush/fileQueue`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: JSON.stringify(jobData) // ✅ Correct format
      })
    });

    res.status(200).json({
      message: 'File uploaded successfully and queued for processing',
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (err) {
    console.error('❌ Error pushing to Redis queue via REST:', err);
    res.status(500).json({ error: 'Failed to queue file for processing' });
  }
});

module.exports = router;
