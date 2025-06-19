const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const socketIO = require('socket.io');
const uploadRoutes = require('./routes/upload');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.set('io', io);
app.use('/api', uploadRoutes);

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const fileIdMap = new Map(); // Maps fileId -> lastProgress

// Endpoint to register fileId to track
app.post('/api/track/:fileId', (req, res) => {
  const { fileId } = req.params;
  fileIdMap.set(fileId, null);
  res.sendStatus(200);
});

// Dynamic import of node-fetch and start polling
(async () => {
  const fetch = (await import('node-fetch')).default;

  setInterval(async () => {
    for (const [fileId, lastProgress] of fileIdMap) {
      try {
        const response = await fetch(`${redisUrl}/get/fileProgress:${fileId}`, {
          headers: {
            Authorization: `Bearer ${redisToken}`,
          },
        });

        const result = await response.json();
        if (result.result) {
          const progress = JSON.parse(result.result);
          if (progress !== lastProgress) {
            io.emit('file-progress', progress);
            fileIdMap.set(fileId, progress);
          }
        }
      } catch (err) {
        console.error(`❌ Polling error for file ${fileId}:`, err);
      }
    }
  }, 2000);
})();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
