// worker.js
const redis = require('./redis');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('redis');
const Record = require('./Record');
const mongoose = require('mongoose');
require('dotenv').config(); // Load .env to access MONGO_URI

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB connected in worker');
}).catch((err) => {
  console.error('❌ MongoDB connection error in worker:', err);
});


const pub = createClient({
  url: 'redis://127.0.0.1:6379' // IPv4 enforced
});

pub.connect()
  .then(() => console.log("📡 Publisher connected to Redis"))
  .catch((err) => console.error("❌ Redis connection error:", err));

async function processFile(job) {
  const filePath = path.join(__dirname, 'uploads', job.filename);
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  console.log(`📂 Uploading ${job.filename} with ${data.length} records...`);

  const batchSize = 1000;
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);

    for (const row of batch) {
      try {
        // ✅ Example validation
        if (!row.email || !row.name) throw new Error('Missing required fields');

        // ✅ Duplicate check
        const exists = await Record.findOne({ 'data.email': row.email });
        if (exists) throw new Error('Duplicate entry');

        // ✅ Save success record
        await Record.create({
          filename: job.filename,
          data: row,
          status: 'success'
        });

        successCount++;
      } catch (err) {
        // ✅ Save failed record
        await Record.create({
          filename: job.filename,
          data: row,
          status: 'failed',
          error: err.message
        });

        failedCount++;
      }
    }

    // ✅ Publish batch progress
    await pub.publish('fileProgress', JSON.stringify({
      filename: job.filename,
      batch: i / batchSize + 1,
      total: Math.ceil(data.length / batchSize)
    }));

    await new Promise(res => setTimeout(res, 500)); // Simulate delay
  }

  // ✅ Publish final summary
  await pub.publish('fileProgress', JSON.stringify({
    filename: job.filename,
    completed: true,
    summary: {
      total: data.length,
      success: successCount,
      failed: failedCount
    }
  }));

  console.log(`🎉 Completed uploading of ${job.filename}`);
}

async function startWorker() {
  console.log('👷 Worker is running. Waiting for jobs...');

  while (true) {
    try {
      const jobData = await redis.brpop('fileQueue', 0); // Blocking pop
      const job = JSON.parse(jobData[1]);
      await processFile(job);
    } catch (err) {
      console.error('❌ Error processing job:', err);
    }
  }
}

startWorker();
