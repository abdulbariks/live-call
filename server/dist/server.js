import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
// const app = express();
// const httpServer = createServer(app);
// // Configure CORS
// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:3000' || 'http://192.168.7.66:3000',
//   credentials: true
// }));
// app.use(express.json());
// // Socket.IO setup
// const io = new Server(httpServer, {
//   cors: {
//     origin: process.env.FRONTEND_URL || 'http://localhost:3000' || "http://192.168.7.66:3000",
//     methods: ['GET', 'POST'],
//     credentials: true
//   }
// });
const app = express();
const httpServer = createServer(app);
const allowedOrigins = new Set([
    "https://live-call-gray.vercel.app",
    "https://live-call-abdulbariks-projects.vercel.app",
    "https://live-call-git-main-abdulbariks-projects.vercel.app",
    "https://live-call-iuck9jeqx-abdulbariks-projects.vercel.app",
    "https://live-call-xvxx.onrender.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://192.168.7.66:3000",
    ...(process.env.FRONTEND_URL || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
]);
const isAllowedOrigin = (origin) => {
    if (!origin)
        return true;
    if (allowedOrigins.has(origin))
        return true;
    try {
        const { hostname, protocol } = new URL(origin);
        return (protocol === "https:" &&
            (hostname === "live-call-gray.vercel.app" ||
                (hostname.startsWith("live-call-") && hostname.endsWith(".vercel.app")) ||
                hostname === "live-call-xvxx.onrender.com"));
    }
    catch {
        return false;
    }
};
const corsOrigin = (origin, callback) => {
    if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
    }
    console.warn(`Blocked by CORS: ${origin}`);
    callback(new Error("Not allowed by CORS"));
};
// CORS middleware for Express
app.use(cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
}));
app.options("*", cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
}));
app.use(express.json());
// SOCKET.IO with CORS
const io = new Server(httpServer, {
    cors: {
        origin: corsOrigin,
        methods: ["GET", "POST"],
        credentials: true,
    },
});
// In-memory storage
const users = new Map();
const rooms = new Map();
const chatHistory = new Map();
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        users: users.size,
        rooms: rooms.size,
        timestamp: new Date().toISOString()
    });
});
// Handle Socket.IO polling transport preflight - removed as cors middleware handles it
// Socket.IO event handlers
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    // Register user
    socket.on('register', ({ username }) => {
        const userId = uuidv4();
        const user = {
            id: userId,
            socketId: socket.id,
            username
        };
        users.set(socket.id, user);
        socket.emit('registered', { userId, username });
        // Broadcast updated user list
        io.emit('users:update', Array.from(users.values()).map(u => ({
            id: u.id,
            username: u.username,
            room: u.room
        })));
        console.log(`User registered: ${username} (${userId})`);
    });
    // Join room
    socket.on('room:join', ({ roomId }) => {
        const user = users.get(socket.id);
        if (!user)
            return;
        // Leave previous room if any
        if (user.room) {
            socket.leave(user.room);
            const oldRoom = rooms.get(user.room);
            if (oldRoom) {
                oldRoom.users.delete(socket.id);
                socket.to(user.room).emit('user:left', { userId: user.id, username: user.username });
            }
        }
        // Join new room
        socket.join(roomId);
        user.room = roomId;
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                id: roomId,
                users: new Set([socket.id]),
                createdAt: new Date()
            });
            chatHistory.set(roomId, []);
        }
        else {
            rooms.get(roomId).users.add(socket.id);
        }
        // Send room history
        const history = chatHistory.get(roomId) || [];
        socket.emit('room:history', history);
        // Notify others
        socket.to(roomId).emit('user:joined', {
            userId: user.id,
            username: user.username
        });
        // Send current room users
        const roomUsers = Array.from(rooms.get(roomId).users)
            .map(sid => users.get(sid))
            .filter(u => u)
            .map(u => ({ id: u.id, username: u.username }));
        io.to(roomId).emit('room:users', roomUsers);
        console.log(`User ${user.username} joined room ${roomId}`);
    });
    // Chat message
    socket.on('chat:message', ({ content, roomId }) => {
        const user = users.get(socket.id);
        if (!user)
            return;
        const message = {
            id: uuidv4(),
            senderId: user.id,
            senderName: user.username,
            content,
            timestamp: new Date(),
            room: roomId
        };
        if (roomId) {
            // Room message
            const history = chatHistory.get(roomId) || [];
            history.push(message);
            chatHistory.set(roomId, history);
            io.to(roomId).emit('chat:message', message);
        }
        else {
            // Broadcast to all
            io.emit('chat:message', message);
        }
        console.log(`Message from ${user.username}: ${content}`);
    });
    // WebRTC Signaling - Offer
    socket.on('webrtc:offer', ({ offer, targetUserId, callType }) => {
        const sender = users.get(socket.id);
        if (!sender)
            return;
        // Find target user's socket
        const targetUser = Array.from(users.values()).find(u => u.id === targetUserId);
        if (!targetUser) {
            socket.emit('webrtc:error', { message: 'User not found' });
            return;
        }
        io.to(targetUser.socketId).emit('webrtc:offer', {
            offer,
            callerId: sender.id,
            callerName: sender.username,
            callType
        });
        console.log(`WebRTC offer from ${sender.username} to ${targetUser.username}`);
    });
    // WebRTC Signaling - Answer
    socket.on('webrtc:answer', ({ answer, callerId }) => {
        const sender = users.get(socket.id);
        if (!sender)
            return;
        const callerUser = Array.from(users.values()).find(u => u.id === callerId);
        if (!callerUser)
            return;
        io.to(callerUser.socketId).emit('webrtc:answer', {
            answer,
            answererId: sender.id
        });
        console.log(`WebRTC answer from ${sender.username} to ${callerUser.username}`);
    });
    // WebRTC Signaling - ICE Candidate
    socket.on('webrtc:ice-candidate', ({ candidate, targetUserId }) => {
        const targetUser = Array.from(users.values()).find(u => u.id === targetUserId);
        if (!targetUser)
            return;
        io.to(targetUser.socketId).emit('webrtc:ice-candidate', {
            candidate,
            senderId: users.get(socket.id)?.id
        });
    });
    // Call ended
    socket.on('webrtc:end-call', ({ targetUserId }) => {
        const targetUser = Array.from(users.values()).find(u => u.id === targetUserId);
        if (!targetUser)
            return;
        io.to(targetUser.socketId).emit('webrtc:call-ended', {
            enderId: users.get(socket.id)?.id
        });
    });
    // Group call signaling
    socket.on('group:call-start', ({ roomId }) => {
        const user = users.get(socket.id);
        if (!user || user.room !== roomId)
            return;
        socket.to(roomId).emit('group:call-started', {
            initiatorId: user.id,
            initiatorName: user.username
        });
    });
    socket.on('group:webrtc:offer', ({ offer, targetUserId, roomId }) => {
        const sender = users.get(socket.id);
        const targetUser = Array.from(users.values()).find(u => u.id === targetUserId);
        if (!sender || !targetUser)
            return;
        io.to(targetUser.socketId).emit('group:webrtc:offer', {
            offer,
            senderId: sender.id,
            senderName: sender.username,
            roomId
        });
    });
    socket.on('group:webrtc:answer', ({ answer, targetUserId, roomId }) => {
        const sender = users.get(socket.id);
        const targetUser = Array.from(users.values()).find(u => u.id === targetUserId);
        if (!sender || !targetUser)
            return;
        io.to(targetUser.socketId).emit('group:webrtc:answer', {
            answer,
            senderId: sender.id,
            roomId
        });
    });
    socket.on('group:webrtc:ice-candidate', ({ candidate, targetUserId, roomId }) => {
        const targetUser = Array.from(users.values()).find(u => u.id === targetUserId);
        if (!targetUser)
            return;
        io.to(targetUser.socketId).emit('group:webrtc:ice-candidate', {
            candidate,
            senderId: users.get(socket.id)?.id,
            roomId
        });
    });
    // Disconnect
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            // Leave room
            if (user.room) {
                const room = rooms.get(user.room);
                if (room) {
                    room.users.delete(socket.id);
                    socket.to(user.room).emit('user:left', {
                        userId: user.id,
                        username: user.username
                    });
                    // Clean up empty rooms
                    if (room.users.size === 0) {
                        rooms.delete(user.room);
                        chatHistory.delete(user.room);
                    }
                }
            }
            users.delete(socket.id);
            // Broadcast updated user list
            io.emit('users:update', Array.from(users.values()).map(u => ({
                id: u.id,
                username: u.username,
                room: u.room
            })));
            console.log(`User disconnected: ${user.username}`);
        }
        else {
            console.log(`Unknown user disconnected: ${socket.id}`);
        }
    });
});
const PORT = Number(process.env.PORT) || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═════════════════════════════════════════════╗
║   Real-time Communication Server Started   ║
╠═════════════════════════════════════════════╣
║   Port: ${PORT}                             
║   WebSocket: ws://0.0.0.0:${PORT}         
║   Accessible via: ws://<hostname>:${PORT} where hostname is localhost or your LAN IP
║   Frontend: ${process.env.FRONTEND_URL || 'https://live-call-gray.vercel.app' || 'http://localhost:3000' || 'http://192.168.7.66:3000' || 'https://live-call-gray.vercel.app'}
╚══════════════════════════════════════════════╝
  `);
});
