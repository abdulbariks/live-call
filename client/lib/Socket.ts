import { io, Socket } from 'socket.io-client';

let BACKEND_URL: string;
if (typeof window !== 'undefined') {
   const isDev = window.location.hostname === 'localhost' || 
                window.location.hostname === '192.168.7.66';
   if (isDev) {
    BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;
  } else {
    BACKEND_URL = 'https://live-call-39rh.onrender.com';
  }
} else {
  // Server (for SSR): use env var or default
  BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://live-call-39rh.onrender.com';
}

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(BACKEND_URL, {
      autoConnect: false,
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
    
    if (socket.connected) {
      socket.emit('register', { username });
      socket.once('registered', (data) => resolve(data));
      return;
    }

    socket.connect();

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.emit('register', { username });
    });

    socket.once('registered', (data) => {
      console.log('User registered:', data);
      resolve(data);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      reject(error);
    });
  });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};