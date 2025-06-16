// Record.js
const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
  filename: String,
  data: Object,
  status: {
    type: String,
    enum: ['success', 'failed']
  },
  error: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Record', recordSchema);
