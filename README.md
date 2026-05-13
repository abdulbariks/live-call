# RealTime Connect

A full-featured real-time communication platform built with **Next.js**, **Node.js**, **Express**, **Socket.IO**, and **WebRTC**.

## 🚀 Features

- ✅ **Real-time Chat** - Instant messaging with Socket.IO
- ✅ **One-to-One Audio Calls** - Crystal clear WebRTC audio calls
- ✅ **One-to-One Video Calls** - HD video calling with camera controls
- ✅ **Group Chat Rooms** - Join themed chat rooms
- ✅ **User Presence** - See who's online in real-time
- ✅ **Full TypeScript** - Type-safe codebase
- ✅ **Modern UI** - Beautiful, responsive interface with Tailwind CSS

## 📁 Project Structure

```
realtime-connect/
├── backend/                 # Node.js + Express + Socket.IO Server
│   ├── server.ts            # Main server with WebRTC signaling
│   │        
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/               # Next.js Application
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx    # Main entry point
    │   │   ├── layout.tsx  # Root layout
    │   │   └── globals.css # Global styles
    │   ├── components/chats
    │   │   ├── Chats.tsx          # Main chat UI
    │   │   ├── ChatInterface.tsx  # ChatInterface UI
    │   │   ├── VideoCall.tsx      # Video call component
    │   │   └── AudioCall.tsx      # Audio call component
    │   └── lib/
    │       ├── socket.ts          # Socket.IO client
    │       └── webrtc.ts          # WebRTC manager
    ├── package.json
    ├── tsconfig.json
    └── next.config.js
```

## 🛠️ Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **Socket.IO** - Real-time bidirectional communication
- **TypeScript** - Type safety
- **UUID** - Unique identifier generation

### Frontend
- **Next.js 14** - React framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **Socket.IO Client** - Real-time client
- **Lucide React** - Beautiful icons

### Communication
- **WebRTC** - Peer-to-peer audio/video
- **Socket.IO** - Signaling server for WebRTC

## 📦 Installation

### Prerequisites
- **Node.js** v18+ and npm
- Modern web browser with WebRTC support

### Step 1: Clone or Navigate to Project Directory

```bash
cd /live-call
```

### Step 2: Install Backend Dependencies

```bash
cd server
npm install
```

### Step 3: Install Frontend Dependencies

```bash
cd ../client
npm install
```

## 🚀 Running the Application

### Terminal 1: Start Backend Server

```bash
cd server
npm run dev
```

The backend will start on **http://localhost:5000**

### Terminal 2: Start Frontend Application

```bash
cd client
npm run dev
```

The frontend will start on **http://localhost:3000**

### Open in Browser

Navigate to **http://localhost:3000** and start chatting!

## 🎯 Usage Guide

### 1. Register
- Enter your username on the landing page
- Click "Join Chat" to connect

### 2. Chat
- Send messages in the global chat
- Join themed rooms (General, Tech)
- See real-time message delivery

### 3. Audio Calls
- Click the "Audio" button next to any online user
- Control microphone and speaker during call
- View call duration and connection quality

### 4. Video Calls
- Click the "Video" button next to any online user
- Toggle camera and microphone
- See both local and remote video feeds

### 5. Rooms
- Join "General Room" or "Tech Room" for group chats
- Room-specific message history
- Leave rooms anytime

## 🔧 Configuration

### Backend Environment Variables

Create a `.env` file in the `server` directory:

```env
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### Frontend Environment Variables

Create a `.env.local` file in the `client` directory:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

## 🏗️ Build for Production

### Backend

```bash
cd backend
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm run build
npm start
```

## 📡 API Endpoints

### Backend REST API

- `GET /health` - Health check endpoint

### Socket.IO Events

#### Client → Server
- `register` - Register user with username
- `room:join` - Join a chat room
- `chat:message` - Send a chat message
- `webrtc:offer` - Send WebRTC offer
- `webrtc:answer` - Send WebRTC answer
- `webrtc:ice-candidate` - Send ICE candidate
- `webrtc:end-call` - End active call

#### Server → Client
- `registered` - Confirmation of registration
- `users:update` - Updated list of online users
- `chat:message` - Receive chat message
- `room:history` - Chat history for room
- `user:joined` - User joined room
- `user:left` - User left room
- `webrtc:offer` - Receive call offer
- `webrtc:answer` - Receive call answer
- `webrtc:ice-candidate` - Receive ICE candidate
- `webrtc:call-ended` - Call ended by peer

## 🎨 Design Features

- **Dark Mode UI** - Easy on the eyes
- **Emerald/Teal Accent** - Professional color scheme
- **Glass Morphism** - Modern glassmorphic effects
- **Smooth Animations** - Polished user experience
- **Responsive Design** - Works on all screen sizes
- **Custom Scrollbars** - Themed scrollbar styling

## 🔒 Security Considerations

### For Production Deployment:
1. **HTTPS Required** - WebRTC requires HTTPS in production
2. **STUN/TURN Servers** - Configure proper TURN servers for NAT traversal
3. **Authentication** - Add proper user authentication
4. **Rate Limiting** - Implement rate limiting on Socket.IO events
5. **Input Validation** - Sanitize all user inputs
6. **CORS Configuration** - Restrict CORS to specific domains

## 🐛 Troubleshooting

### Camera/Microphone Not Working
- Grant browser permissions for camera/microphone
- Check if other apps are using the devices
- Try reloading the page

### Connection Issues
- Ensure backend is running on port 5000
- Check firewall settings
- Verify CORS configuration

### WebRTC Connection Fails
- Check browser console for errors
- Ensure both users have granted media permissions
- Network firewalls might block WebRTC (need TURN server)

## 🚧 Known Limitations

- No persistent storage (messages cleared on server restart)
- Basic room system (fixed room names)
- No screen sharing (can be added)
- No group video calls (signaling for this is complex)
- No file sharing
- STUN servers only (no TURN for NAT traversal)

## 🔮 Future Enhancements

- [ ] Database integration for message persistence
- [ ] User authentication (JWT)
- [ ] Screen sharing capability
- [ ] Group video conferencing
- [ ] File/image sharing
- [ ] Message reactions and emojis
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Push notifications
- [ ] Mobile app (React Native)

## 📝 License

MIT License - Feel free to use this project for learning and development!

## 🤝 Contributing

This is a demonstration project. Feel free to fork and customize!

## 📧 Support

For issues or questions, check the browser console logs and server logs for debugging information.

---

**Built with ❤️ using Next.js, Socket.IO, and WebRTC**

Happy Chatting! 🎉
