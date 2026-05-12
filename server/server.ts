import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const httpServer = createServer(app);

// Configure CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Types
interface User {
  id: string;
  socketId: string;
  username: string;
  room?: string;
}

interface Room {
  id: string;
  users: Set<string>;
  createdAt: Date;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  room?: string;
}

// In-memory storage
const users = new Map<string, User>();
const rooms = new Map<string, Room>();
const chatHistory = new Map<string, ChatMessage[]>();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    users: users.size,
    rooms: rooms.size,
    timestamp: new Date().toISOString()
  });
});

// Socket.IO event handlers
io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  // Register user
  socket.on('register', ({ username }: { username: string }) => {
    const userId = uuidv4();
    const user: User = {
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
  socket.on('room:join', ({ roomId }: { roomId: string }) => {
    const user = users.get(socket.id);
    if (!user) return;

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
    } else {
      rooms.get(roomId)!.users.add(socket.id);
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
    const roomUsers = Array.from(rooms.get(roomId)!.users)
      .map(sid => users.get(sid))
      .filter(u => u)
      .map(u => ({ id: u!.id, username: u!.username }));
    
    io.to(roomId).emit('room:users', roomUsers);

    console.log(`User ${user.username} joined room ${roomId}`);
  });

  // Chat message
  socket.on('chat:message', ({ content, roomId }: { content: string; roomId?: string }) => {
    const user = users.get(socket.id);
    if (!user) return;

    const message: ChatMessage = {
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
    } else {
      // Broadcast to all
      io.emit('chat:message', message);
    }

    console.log(`Message from ${user.username}: ${content}`);
  });

  // WebRTC Signaling - Offer
  socket.on('webrtc:offer', ({ 
    offer, 
    targetUserId, 
    callType 
  }: { 
    offer: RTCSessionDescriptionInit; 
    targetUserId: string;
    callType: 'audio' | 'video';
  }) => {
    const sender = users.get(socket.id);
    if (!sender) return;

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
  socket.on('webrtc:answer', ({ 
    answer, 
    callerId 
  }: { 
    answer: RTCSessionDescriptionInit; 
    callerId: string;
  }) => {
    const sender = users.get(socket.id);
    if (!sender) return;

    const callerUser = Array.from(users.values()).find(u => u.id === callerId);
    if (!callerUser) return;

    io.to(callerUser.socketId).emit('webrtc:answer', {
      answer,
      answererId: sender.id
    });

    console.log(`WebRTC answer from ${sender.username} to ${callerUser.username}`);
  });

  // WebRTC Signaling - ICE Candidate
  socket.on('webrtc:ice-candidate', ({ 
    candidate, 
    targetUserId 
  }: { 
    candidate: RTCIceCandidateInit; 
    targetUserId: string;
  }) => {
    const targetUser = Array.from(users.values()).find(u => u.id === targetUserId);
    if (!targetUser) return;

    io.to(targetUser.socketId).emit('webrtc:ice-candidate', {
      candidate,
      senderId: users.get(socket.id)?.id
    });
  });

  // Call ended
  socket.on('webrtc:end-call', ({ targetUserId }: { targetUserId: string }) => {
    const targetUser = Array.from(users.values()).find(u => u.id === targetUserId);
    if (!targetUser) return;

    io.to(targetUser.socketId).emit('webrtc:call-ended', {
      enderId: users.get(socket.id)?.id
    });
  });

  // Group call signaling
  socket.on('group:call-start', ({ roomId }: { roomId: string }) => {
    const user = users.get(socket.id);
    if (!user || user.room !== roomId) return;

    socket.to(roomId).emit('group:call-started', {
      initiatorId: user.id,
      initiatorName: user.username
    });
  });

  socket.on('group:webrtc:offer', ({ 
    offer, 
    targetUserId, 
    roomId 
  }: { 
    offer: RTCSessionDescriptionInit; 
    targetUserId: string;
    roomId: string;
  }) => {
    const sender = users.get(socket.id);
    const targetUser = Array.from(users.values()).find(u => u.id === targetUserId);
    
    if (!sender || !targetUser) return;

    io.to(targetUser.socketId).emit('group:webrtc:offer', {
      offer,
      senderId: sender.id,
      senderName: sender.username,
      roomId
    });
  });

  socket.on('group:webrtc:answer', ({ 
    answer, 
    targetUserId,
    roomId 
  }: { 
    answer: RTCSessionDescriptionInit; 
    targetUserId: string;
    roomId: string;
  }) => {
    const sender = users.get(socket.id);
    const targetUser = Array.from(users.values()).find(u => u.id === targetUserId);
    
    if (!sender || !targetUser) return;

    io.to(targetUser.socketId).emit('group:webrtc:answer', {
      answer,
      senderId: sender.id,
      roomId
    });
  });

  socket.on('group:webrtc:ice-candidate', ({ 
    candidate, 
    targetUserId,
    roomId 
  }: { 
    candidate: RTCIceCandidateInit; 
    targetUserId: string;
    roomId: string;
  }) => {
    const targetUser = Array.from(users.values()).find(u => u.id === targetUserId);
    if (!targetUser) return;

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
    } else {
      console.log(`Unknown user disconnected: ${socket.id}`);
    }
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   Real-time Communication Server Started   ║
╠════════════════════════════════════════════╣
║   Port: ${PORT}                             
║   WebSocket: ws://localhost:${PORT}         
║   Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
╚════════════════════════════════════════════╝
  `);
});