const express = require('express');
const redis = require('../redis'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();


const uploadPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);

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

  try {
    
    await redis.lpush('fileQueue', JSON.stringify(jobData));

    res.status(200).json({
      message: 'File uploaded successfully and queued for processing',
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (err) {
    console.error('❌ Error pushing to Redis queue:', err);
    res.status(500).json({ error: 'Failed to queue file for processing' });
  }
});

module.exports = router;
