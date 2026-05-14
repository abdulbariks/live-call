'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import ChatInterface from './ChatInterface';
import { connectSocket } from '@/lib/Socket';

export default function Chats() {
  const [username, setUsername] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [userId, setUserId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsConnecting(true);
    setError('');

    try {
      const data = await connectSocket(username.trim());
      setUserId(data.userId);
      setIsRegistered(true);
    } catch (err) {
      setError('Failed to connect. Please try again.');
      console.error('Connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  if (isRegistered) {
    return <ChatInterface username={username} userId={userId} />;
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-3 py-6 sm:p-6 relative overflow-hidden bg-[linear-gradient(135deg,#f8fbff_0%,#eef6ff_48%,#ecfdf5_100%)]">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-emerald-400/15 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-effect rounded-2xl p-5 sm:p-8 animate-slide-up">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              <span className="text-gradient">RealTime Connect</span>
            </h1>
            <p className="text-[var(--color-text-muted)] text-sm">
              Enter your name to join the conversation
            </p>
          </div>

          {/* Registration form */}
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2 text-[var(--color-text-muted)]">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name..."
                className="w-full px-4 py-3 bg-white border border-[var(--color-border)] rounded-lg text-[var(--color-text)] shadow-sm placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-4 focus:ring-blue-100"
                disabled={isConnecting}
                maxLength={20}
                autoComplete="off"
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!username.trim() || isConnecting}
              className="w-full py-3 px-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:bg-[var(--color-border)] disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-sm flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Join Chat'
              )}
            </button>
          </form>

          {/* Features list */}
          <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-[var(--color-text-muted)]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[var(--color-accent)] rounded-full" />
                <span>One-to-One Chat</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[var(--color-accent)] rounded-full" />
                <span>Audio Calls</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[var(--color-accent)] rounded-full" />
                <span>Video Calls</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[var(--color-accent)] rounded-full" />
                <span>Group Calls</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-xs text-[var(--color-text-subtle)]">
          Built with Next.js, Socket.IO & WebRTC
        </p>
      </div>
    </div>
  );
}
