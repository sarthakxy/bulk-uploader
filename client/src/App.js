// client/src/App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:5000'); // Connect to backend

function App() {
  const [file, setFile] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Listen for backend processing updates
    socket.on('file-progress', (data) => {
      if (data.completed) {
        setProcessingProgress(100);
        setMessage(`✅ File processed: ${data.filename}`);
      } else {
        const progress = Math.round((data.batch / data.total) * 100);
        setProcessingProgress(progress);
        setMessage(`⚙️ Processing batch ${data.batch} of ${data.total}...`);
      }
    });

    return () => {
      socket.off('file-progress');
    };
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
    setProcessingProgress(0);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('⚠️ Please select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('http://localhost:5000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage('📤 File uploaded. Waiting for backend processing to complete...');
    } catch (error) {
      console.error(error);
      setMessage('❌ Upload failed. See console for details.');
    }
  };

  return (
    <div className="App">
      <h1>📤 Bulk File Uploader</h1>

      <input type="file" onChange={handleFileChange} accept=".csv,.xlsx" />
      {file && (
        <p>
          <strong>Selected file:</strong> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
        </p>
      )}

      <button onClick={handleUpload}>Upload</button>

      {processingProgress > 0 && (
        <div className="progress-bar processing">
          <div className="progress" style={{ width: `${processingProgress}%` }}>
            Uploading: {processingProgress}%
          </div>
        </div>
      )}

      {message && <p className="message">{message}</p>}
    </div>
  );
}

export default App;
