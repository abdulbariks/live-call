import { io, Socket } from 'socket.io-client';

const BACKEND_URL: string = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://live-call-xvxx.onrender.com';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(BACKEND_URL, {
      autoConnect: false,
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
  }
  return socket;
};

export const connectSocket = (username: string): Promise<{ userId: string; username: string }> => {
  return new Promise((resolve, reject) => {
    const socket = getSocket();
    const cleanUp = () => {
      socket.off('connect', handleConnect);
      socket.off('registered', handleRegistered);
      socket.off('connect_error', handleConnectError);
    };
    const handleConnect = () => {
      console.log('Socket connected:', socket.id);
      socket.emit('register', { username });
    };
    const handleRegistered = (data: { userId: string; username: string }) => {
      console.log('User registered:', data);
      cleanUp();
      resolve(data);
    };
    const handleConnectError = (error: Error) => {
      console.error('Socket connection error:', error);
      cleanUp();
      reject(error);
    };
    
    if (socket.connected) {
      socket.emit('register', { username });
      socket.once('registered', handleRegistered);
      return;
    }

    socket.once('connect', handleConnect);
    socket.once('registered', handleRegistered);
    socket.once('connect_error', handleConnectError);
    socket.connect();
  });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
