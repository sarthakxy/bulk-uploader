// server/app.js
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

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.set('io', io);
app.use('/api', uploadRoutes);

// Setup Redis subscriber to listen for progress events
const subscriber = createClient({
  url: 'redis://127.0.0.1:6379' // IPv4 localhost
});

subscriber.connect().then(() => {
  console.log('📡 Redis subscriber connected');
  subscriber.subscribe('fileProgress', (message) => {
    const data = JSON.parse(message);
    io.emit('file-progress', data); // emit to all connected clients
  });
}).catch(console.error);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
