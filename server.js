require("dotenv")
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Message = require('./models/Message');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("./public"))

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*', // For development purposes. In production, specify the frontend URL.
        methods: ['GET', 'POST'],
    },
});

// Configure MongoDB connection URI
// In production, this should come from process.env.MONGODB_URI
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
    .connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send existing messages to the newly connected user
    Message.find()
        .sort({ timestamp: 1 })
        .limit(50)
        .then((messages) => {
            socket.emit('initial_messages', messages);
        })
        .catch((err) => console.error('Error fetching messages:', err));

    // Handle incoming messages
    socket.on('send_message', async (data) => {
        try {
            // Save message to database
            const newMessage = new Message({
                sender: data.sender,
                text: data.text,
            });
            const savedMessage = await newMessage.save();

            // Broadcast the message to all connected clients
            io.emit('receive_message', savedMessage);
        } catch (err) {
            console.error('Error saving message:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
app.use('*name',(req,res)=>{
    res.sendFile(path.join(__dirname,"..","/public/index.html"))
})