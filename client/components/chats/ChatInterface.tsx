'use client';

import { useState, useEffect, useRef } from 'react';
import { getSocket } from '@/lib/Socket';
import { 
  MessageCircle, 
  Users, 
  Phone, 
  Video, 
  Send, 
  X,
  UserCircle,
  LogOut,
  Hash,
  PhoneCall
} from 'lucide-react';
import VideoCall from './VideoCall';
import AudioCall from './AudioCall';



interface User {
  id: string;
  username: string;
  room?: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  username: string;
  userId: string;
}

export default function ChatInterface({ username, userId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<{ type: 'audio' | 'video'; userId: string; username: string } | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ type: 'audio' | 'video'; callerId: string; callerName: string; offer: RTCSessionDescriptionInit } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  useEffect(() => {
    // Listen for user updates
    socket.on('users:update', (updatedUsers: User[]) => {
      setUsers(updatedUsers.filter(u => u.id !== userId));
    });

    // Listen for messages
    socket.on('chat:message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for room history
    socket.on('room:history', (history: Message[]) => {
      setMessages(history);
    });

    // Listen for incoming calls
    socket.on('webrtc:offer', ({ offer, callerId, callerName, callType }) => {
      setIncomingCall({ offer, callerId, callerName, type: callType });
    });

    return () => {
      socket.off('users:update');
      socket.off('chat:message');
      socket.off('room:history');
      socket.off('webrtc:offer');
    };
  }, [socket, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    socket.emit('chat:message', { 
      content: inputMessage,
      roomId: currentRoom 
    });
    setInputMessage('');
  };

  const handleJoinRoom = (roomId: string) => {
    socket.emit('room:join', { roomId });
    setCurrentRoom(roomId);
    setMessages([]);
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setMessages([]);
  };

  const handleStartCall = (targetUser: User, callType: 'audio' | 'video') => {
    setActiveCall({
      type: callType,
      userId: targetUser.id,
      username: targetUser.username
    });
  };

  const handleAcceptCall = () => {
    if (!incomingCall) return;
    setActiveCall({
      type: incomingCall.type,
      userId: incomingCall.callerId,
      username: incomingCall.callerName
    });
    setIncomingCall(null);
  };

  const handleRejectCall = () => {
    setIncomingCall(null);
  };

  const handleEndCall = () => {
    setActiveCall(null);
  };

  const handleLogout = () => {
    socket.disconnect();
    window.location.reload();
  };

  // Active call rendering
  if (activeCall) {
    if (activeCall.type === 'video') {
      return (
        <VideoCall
          localUserId={userId}
          remoteUserId={activeCall.userId}
          remoteUsername={activeCall.username}
          initialOffer={incomingCall?.offer}
          onEndCall={handleEndCall}
        />
      );
    } else {
      return (
        <AudioCall
          localUserId={userId}
          remoteUserId={activeCall.userId}
          remoteUsername={activeCall.username}
          initialOffer={incomingCall?.offer}
          onEndCall={handleEndCall}
        />  

      );
    }
  }

  return (
    <div className="h-dvh min-h-0 flex flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3 sm:px-6 sm:py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[var(--color-accent)] rounded-full flex shrink-0 items-center justify-center">
              <UserCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-[var(--color-text)] truncate">{username}</h2>
              <p className="text-xs text-[var(--color-text-muted)] truncate">
                {currentRoom ? `Room: ${currentRoom}` : 'Global Chat'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col md:flex-row overflow-hidden">
        {/* Sidebar - Users */}
        <div className="w-full md:w-80 md:shrink-0 max-h-[42dvh] md:max-h-none bg-[var(--color-surface)] border-b md:border-b-0 md:border-r border-[var(--color-border)] flex flex-col">
          <div className="p-3 sm:p-4 border-b border-[var(--color-border)]">
            <h3 className="font-semibold text-[var(--color-text)] flex items-center gap-2">
              <Users className="w-5 h-5" />
              Online Users ({users.length})
            </h3>
          </div>
          
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
            {users.length === 0 ? (
              <p className="text-center text-[var(--color-text-muted)] py-8 text-sm">
                No other users online
              </p>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className="p-3 bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)] group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="w-8 h-8 bg-[var(--color-accent-dim)] rounded-full flex shrink-0 items-center justify-center text-xs font-medium text-[var(--color-accent)]">
                        {user.username[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-[var(--color-text)] truncate">{user.username}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleStartCall(user, 'audio')}
                      className="min-w-0 py-2 px-2 sm:px-3 bg-[var(--color-surface)] hover:bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm flex items-center justify-center gap-2"
                    >
                      <Phone className="w-4 h-4" />
                      Audio
                    </button>
                    <button
                      onClick={() => handleStartCall(user, 'video')}
                      className="min-w-0 py-2 px-2 sm:px-3 bg-[var(--color-surface)] hover:bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm flex items-center justify-center gap-2"
                    >
                      <Video className="w-4 h-4" />
                      Video
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Room controls */}
          <div className="p-3 sm:p-4 border-t border-[var(--color-border)] space-y-2">
            {currentRoom ? (
              <button
                onClick={handleLeaveRoom}
                className="w-full py-2 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium"
              >
                Leave Room
              </button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">
                <button
                  onClick={() => handleJoinRoom('general')}
                  className="w-full py-2 px-4 bg-[var(--color-accent-subtle)] hover:bg-[var(--color-accent-dim)] border border-[var(--color-accent)] rounded-lg text-[var(--color-accent)] text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Hash className="w-4 h-4" />
                  Join General Room
                </button>
                <button
                  onClick={() => handleJoinRoom('tech')}
                  className="w-full py-2 px-4 bg-[var(--color-accent-subtle)] hover:bg-[var(--color-accent-dim)] border border-[var(--color-accent)] rounded-lg text-[var(--color-accent)] text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Hash className="w-4 h-4" />
                  Join Tech Room
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 text-[var(--color-text-subtle)] mx-auto mb-4" />
                  <p className="text-[var(--color-text-muted)]">No messages yet</p>
                  <p className="text-sm text-[var(--color-text-subtle)] mt-1">
                    Start a conversation!
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.senderId === userId;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-slide-up`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-md px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm rounded-2xl ${
                        isOwnMessage
                          ? 'bg-[var(--color-accent)] text-white rounded-br-sm'
                          : 'bg-white text-[var(--color-text)] rounded-bl-sm border border-[var(--color-border)]'
                      }`}
                    >
                      {!isOwnMessage && (
                        <p className="text-xs font-medium mb-1 text-[var(--color-accent)]">
                          {message.senderName}
                        </p>
                      )}
                      <p className={isOwnMessage ? 'break-words text-white' : 'break-words text-[var(--color-text)]'}>{message.content}</p>
                      <p className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-[var(--color-text-subtle)]'}`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-100 p-3 sm:p-4 shrink-0">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a message..."
                className="min-w-0 flex-1 px-3 py-3 sm:px-4 bg-white border border-[var(--color-border)] rounded-lg text-[var(--color-text)] shadow-sm placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-4 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="h-12 w-12 sm:w-auto sm:px-6 sm:py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:bg-[var(--color-border)] disabled:cursor-not-allowed text-white font-medium rounded-lg flex shrink-0 items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Incoming Call Modal */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 sm:p-8 max-w-md w-full animate-slide-up">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-[var(--color-accent-dim)] rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-subtle">
                <PhoneCall className="w-10 h-10 text-[var(--color-accent)]" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-text)] mb-2">
                Incoming {incomingCall.type} call
              </h3>
              <p className="text-[var(--color-text-muted)]">
                {incomingCall.callerName} is calling...
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleRejectCall}
                className="flex-1 py-3 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 font-medium flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Decline
              </button>
              <button
                onClick={handleAcceptCall}
                className="flex-1 py-3 px-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-lg text-white font-medium flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
