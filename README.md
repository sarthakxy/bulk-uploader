# 📂 Bulk Uploader with Real-time Processing

This project is a full-stack application that allows users to upload Excel files, processes them in the background in batches, and provides **real-time feedback** on progress using **Redis** and **Socket.IO**.

---

## 🚀 Features

- 📁 Upload `.xlsx` files
- ⚙️ Background processing with Redis Queue
- 📡 Real-time progress updates via Socket.IO
- ✅ Success / ❌ Failure record tracking
- 🔎 Duplicate check & field validation
- 📊 Final summary report (total, success, failed)
- 🚫 Prevent re-selecting the same file
- 🔄 Upload another file after completion

---

## 🛠 Tech Stack

### Frontend
- ⚛️ React (with plain JavaScript)
- 📡 Socket.IO Client for real-time communication
- 🎨 Custom popup and UI feedback
- 📦 Axios for API interaction

### Backend
- 🌐 Node.js + Express
- 🧵 Background worker system
- 🧠 Redis (job queue + pub/sub)
- 🧾 MongoDB (data storage)
- 📤 Multer for file uploads
- 🧪 Mongoose for schema + validation

---

## 📂 Project Structure

bulk-uploader/
├── client/ # React frontend
│ └── src/
│ └── App.js # Main logic & UI
├── server/ # Node.js backend
│ ├── app.js # Express server + Socket.IO
│ ├── worker.js # Redis background job processor
│ ├── Record.js # MongoDB schema
│ └── routes/
│ └── upload.js # Upload API route
├── uploads/ # Temporary file storage
├── .env # Environment variables
└── README.md


## 🌐 Live Demo --   

## ⚙️ Setup Instructions

### Prerequisites

- Node.js
- Redis (local or cloud)
- MongoDB (local or cloud)

### Environment Variables

Create a `.env` file inside the `server/` folder with:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string


Running the Project

# 1. Clone the repo
git clone https://github.com/your-username/bulk-uploader.git
cd bulk-uploader

# 2. Install and run backend
cd server
npm install
node app.js

# 3. Start the background worker
node worker.js

# 4. Run frontend
cd ../client
npm install
npm run dev

