
const redis = require('./redis');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('redis');
const Record = require('./Record');
const mongoose = require('mongoose');
const abortSub = createClient({ url: 'redis://127.0.0.1:6379' });
const abortedJobs = new Set();

require('dotenv').config(); 
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB connected in worker');
}).catch((err) => {
  console.error('❌ MongoDB connection error in worker:', err);
});


const pub = createClient({
  url: 'redis://127.0.0.1:6379' 
});

pub.connect()
  .then(() => console.log("📡 Publisher connected to Redis"))
  .catch((err) => console.error("❌ Redis connection error:", err));

async function processFile(job) {
  const filePath = path.join(__dirname, 'uploads', job.filename);
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  console.log(`📂 Processing ${job.filename} with ${data.length} records...`);

  const batchSize = 1000;
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < data.length; i += batchSize) {
     if (abortedJobs.has(job.filename)) {
    console.log(`⛔ Processing aborted for ${job.filename}`);

    await pub.publish('fileProgress', JSON.stringify({
      filename: job.filename,
      aborted: true
    }));

    return; 
  }
    const batch = data.slice(i, i + batchSize);

    for (const row of batch) {
      try {
        
        if (!row.email || !row.name) throw new Error('Missing required fields');

        
        const exists = await Record.findOne({ 'data.email': row.email });
        if (exists) throw new Error('Duplicate entry');

        
        await Record.create({
          filename: job.filename,
          data: row,
          status: 'success'
        });

        successCount++;
      } catch (err) {
        
        await Record.create({
          filename: job.filename,
          data: row,
          status: 'failed',
          error: err.message
        });

        failedCount++;
      }
    }

    
    await pub.publish('fileProgress', JSON.stringify({
      filename: job.filename,
      batch: i / batchSize + 1,
      total: Math.ceil(data.length / batchSize)
    }));

    await new Promise(res => setTimeout(res, 500)); 
  }

  
  await pub.publish('fileProgress', JSON.stringify({
    filename: job.filename,
    completed: true,
    summary: {
      total: data.length,
      success: successCount,
      failed: failedCount
    }
  }));

  console.log(`🎉 Completed Processing of ${job.filename}`);
}

async function startWorker() {
  console.log('👷 Worker is running. Waiting for jobs...');

  while (true) {
    try {
      const jobData = await redis.brpop('fileQueue', 0); 
      const job = JSON.parse(jobData[1]);
      await processFile(job);
    } catch (err) {
      console.error('❌ Error processing job:', err);
    }
  }
}

startWorker();
