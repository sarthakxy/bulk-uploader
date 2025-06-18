const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const socketIO = require('socket.io');
const { createClient } = require('redis');
const uploadRoutes = require('./routes/upload');

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  }
});


app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.set('io', io);
app.use('/api', uploadRoutes);


const redisClient = createClient({ url: 'redis://127.0.0.1:6379' });
redisClient.connect().then(() => {
  console.log('📡 Redis publisher connected');
}).catch(console.error);


app.post('/api/abort', async (req, res) => {
  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  try {
    await redisClient.publish('abortJob', filename);
    console.log(`❌ Abort triggered for ${filename}`);
    return res.status(200).json({ message: `Abort signal sent for ${filename}` });
  } catch (err) {
    console.error('Abort publish error:', err);
    return res.status(500).json({ error: 'Failed to publish abort signal' });
  }
});


const subscriber = createClient({ url: 'redis://127.0.0.1:6379' });

subscriber.connect().then(() => {
  console.log('📡 Redis subscriber connected');
  subscriber.subscribe('fileProgress', (message) => {
    const data = JSON.parse(message);
    io.emit('file-progress', data); 
  });
}).catch(console.error);


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
