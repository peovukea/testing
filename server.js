const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Create an Express app and an HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the "public" directory
app.use(express.static('public'));

// Handle WebSocket connections
io.on('connection', (socket) => {
    console.log('A user connected');

    // Relay gyroscope data to all connected clients
    socket.on('gyroscopeData', (data) => {
        socket.broadcast.emit('gyroscopeData', data);
    });



    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
