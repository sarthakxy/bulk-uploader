import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';

const BACKEND_URL = 'http://localhost:5000';
const socket = io(BACKEND_URL);

function App() {
  const [file, setFile] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWarningPopup, setShowWarningPopup] = useState(false); 

  useEffect(() => {
    socket.on('file-progress', (data) => {
      if (data.completed) {
        setProcessingProgress(100);
        setMessage(`✅ File processed: ${data.filename}`);
        setShowSuccessPopup(true);
        setIsProcessing(false);
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
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.name === uploadedFileName) {
      setShowWarningPopup(true); 
      return;
    }

    setFile(selectedFile);
    setUploadedFileName(selectedFile.name);
    setMessage('');
    setProcessingProgress(0);
    setIsProcessing(false);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('⚠️ Please select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${BACKEND_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage('📤 File Uploaded. Waiting for backend processing to complete...');
      setIsProcessing(true);
    } catch (error) {
      console.error(error);
      setMessage('❌ Upload failed. See console for details.');
    }
  };

  const handleUploadAnother = () => {
    setFile(null);
    setProcessingProgress(0);
    setMessage('');
    setShowSuccessPopup(false);
    setIsProcessing(false);
  };

  return (
    <div className="app-container">
      <div className="card">
        <h1>📤 Bulk File Uploader</h1>

        <label htmlFor="fileUpload" className="custom-file-upload">
          Choose File
        </label>
        <input
  id="fileUpload"
  type="file"
  onClick={(e) => (e.target.value = null)} 
  onChange={handleFileChange}
  accept=".csv,.xlsx"
/>


        {file && (
          <p className="file-info">
            <strong>Selected:</strong> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}

        <button
          className="upload-button"
          onClick={handleUpload}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Upload'}
        </button>

        {processingProgress > 0 && (
          <div className="progress-bar">
            <div className="progress" style={{ width: `${processingProgress}%` }}>
              {processingProgress}%
            </div>
          </div>
        )}

        {message && <p className="message">{message}</p>}
      </div>

      
      {showSuccessPopup && (
        <div className="popup-overlay">
          <div className="popup">
            <h2>✅ Upload Successful!</h2>
            <p>Your file <strong>{uploadedFileName}</strong> has been processed.</p>
            <button className="upload-another-btn" onClick={handleUploadAnother}>
              Upload Another
            </button>
          </div>
        </div>
      )}

      
      {showWarningPopup && (
        <div className="popup-overlay">
          <div className="popup warning">
            <h2>⚠️ Warning</h2>
            <p>File already selected! Please choose a different file.</p>
            <button className="upload-another-btn" onClick={() => setShowWarningPopup(false)}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
