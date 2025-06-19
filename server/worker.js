const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const csvParser = require('csv-parser');
const XLSX = require('xlsx');
const Record = require('./Record');

dotenv.config();

const REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected in worker'))
  .catch(err => console.error('❌ MongoDB connection error in worker:', err));

async function lpopRedisQueue(queueName) {
  const fetch = (await import('node-fetch')).default;
  try {
    const res = await fetch(`${REDIS_REST_URL}/lpop/${queueName}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_REST_TOKEN}`,
      },
    });

    const data = await res.json();
    console.log('Raw Redis response:', data);

    if (data.result) {
      const outer = JSON.parse(data.result);
      const inner = JSON.parse(outer.value);
      return inner;
    }

    return null;
  } catch (err) {
    console.error('❌ Redis LPOP error:', err);
    return null;
  }
}

async function setRedisProgress(fileId, progressPayload) {
  const fetch = (await import('node-fetch')).default;
  try {
    await fetch(`${REDIS_REST_URL}/set/fileProgress:${fileId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(progressPayload),
    });
  } catch (err) {
    console.error(`❌ Redis SET error for ${fileId}:`, err);
  }
}

function parseFileRows(filePath, ext) {
  return new Promise((resolve, reject) => {
    const rows = [];

    if (ext === '.csv') {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', row => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', reject);
    } else if (ext === '.xlsx') {
      try {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    } else {
      reject(new Error('Unsupported file type'));
    }
  });
}

async function startWorker() {
  console.log('👷 Worker is running. Waiting for jobs...');
  while (true) {
    const job = await lpopRedisQueue('fileQueue');
    if (!job) {
      await new Promise(res => setTimeout(res, 2000));
      continue;
    }

    if (!job.filename) {
      console.error('❌ Job missing filename:', job);
      continue;
    }

    console.log('✅ Job string popped from Redis:', job);

    const filePath = path.join(__dirname, 'uploads', job.filename);
    const ext = path.extname(job.originalName).toLowerCase();

    console.log(`📂 Processing file at: ${filePath}`);

    try {
      const rows = await parseFileRows(filePath, ext);
      console.log(`📊 ${job.filename} has ${rows.length} rows`);

      const BATCH_SIZE = 1000;
      const total = rows.length;

      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        const docs = batch.map(row => ({
          ...row,
          fileId: job.filename,
          uploadedAt: job.uploadedAt,
        }));

        await Record.insertMany(docs, { ordered: false });

        const percent = Math.min(100, Math.round(((i + BATCH_SIZE) / total) * 100));
        const progressPayload = {
  filename: job.filename,
  batch: Math.floor(i / BATCH_SIZE) + 1,
  total: Math.ceil(total / BATCH_SIZE),
  progress: percent > 100 ? 100 : percent,
  completed: i + BATCH_SIZE >= total
};


        console.log(`📩 Batch uploaded: ${progressPayload.progress}%`);

        await setRedisProgress(job.filename, progressPayload);
      }

      console.log(`✅ Finished processing: ${job.filename}`);
    } catch (err) {
      console.error(`❌ Error processing file ${job.filename}:`, err);
    }

    await new Promise(res => setTimeout(res, 2000)); // pause between jobs
  }
}

startWorker();
