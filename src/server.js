const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const setupSocket = require('./socket');

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'Tic Tac Toe server is running',
    status: 'healthy',
  });
});

// Setup socket events
setupSocket(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
