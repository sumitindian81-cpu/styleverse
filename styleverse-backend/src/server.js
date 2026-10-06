require('dotenv').config();   // ✅ add this at the very top

const http = require('http');

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to DB
connectDB();

// Create server
const server = http.createServer(app);

//server.listen(PORT, () => {
  //console.log(`Styleverse backend running on port ${PORT}`);
//});
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Styleverse backend running on port ${PORT}`);
});