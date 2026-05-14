'use client';

import { useState, useEffect, useRef } from 'react';
import { getSocket } from '@/lib/Socket';
import { WebRTCManager } from '@/lib/Webrtc';
import { 
  Phone, 
  Mic, 
  MicOff, 
  PhoneOff,
  Volume2,
  VolumeX,
  Loader2,
  User
} from 'lucide-react';


interface AudioCallProps {
  localUserId: string;
  remoteUserId: string;
  remoteUsername: string;
  initialOffer?: RTCSessionDescriptionInit;
  onEndCall: () => void;
}

export default function AudioCall({
  localUserId,
  remoteUserId,
  remoteUsername,
  initialOffer,
  onEndCall
}: AudioCallProps) {
  const [webrtcManager, setWebrtcManager] = useState<WebRTCManager | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState('');

  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callStartTimeRef = useRef<number>(0);
  const socket = getSocket();

  useEffect(() => {
    const manager = new WebRTCManager(socket);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebrtcManager(manager);

    const setupCall = async () => {
      try {
        // Get local audio stream
        const localStream = await manager.getLocalStream(true, false);
        if (localAudioRef.current) {
          localAudioRef.current.srcObject = localStream;
        }

        // Create peer connection
        await manager.createPeerConnection(
          remoteUserId,
          (remoteStream) => {
            console.log('Received remote audio stream');
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = remoteStream;
            }
            setIsConnected(true);
            setIsConnecting(false);
            callStartTimeRef.current = Date.now();
          },
          (candidate) => {
            socket.emit('webrtc:ice-candidate', {
              candidate,
              targetUserId: remoteUserId
            });
          }
        );

        if (initialOffer) {
          // Answering a call
          const answer = await manager.handleOffer(remoteUserId, initialOffer);
          socket.emit('webrtc:answer', {
            answer,
            callerId: remoteUserId
          });
        } else {
          // Initiating a call
          const offer = await manager.createOffer(remoteUserId);
          socket.emit('webrtc:offer', {
            offer,
            targetUserId: remoteUserId,
            callType: 'audio'
          });
        }

        setIsConnecting(false);
      } catch (err) {
        console.error('Error setting up call:', err);
        setError('Failed to setup audio call. Please check microphone permissions.');
        setIsConnecting(false);
      }
    };

    setupCall();

    // Socket event handlers
    socket.on('webrtc:answer', async ({ answer }) => {
      if (manager) {
        await manager.handleAnswer(remoteUserId, answer);
      }
    });

    socket.on('webrtc:ice-candidate', async ({ candidate, senderId }) => {
      if (manager && senderId === remoteUserId) {
        await manager.addIceCandidate(remoteUserId, candidate);
      }
    });

    socket.on('webrtc:call-ended', () => {
      // eslint-disable-next-line react-hooks/immutability
      handleEndCall();
    });

    return () => {
      socket.off('webrtc:answer');
      socket.off('webrtc:ice-candidate');
      socket.off('webrtc:call-ended');
      if (manager) {
        manager.closeAllConnections();
      }
    };
  }, []);

  // Call duration timer
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
      setCallDuration(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleAudio = () => {
    if (webrtcManager && localAudioRef.current) {
      const audioTrack = (localAudioRef.current.srcObject as MediaStream)
        ?.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !remoteAudioRef.current.muted;
      setIsSpeakerEnabled(!remoteAudioRef.current.muted);
    }
  };

  const handleEndCall = () => {
    socket.emit('webrtc:end-call', { targetUserId: remoteUserId });
    if (webrtcManager) {
      webrtcManager.closeAllConnections();
    }
    onEndCall();
  };

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] flex items-center justify-center overflow-y-auto px-3 py-5 sm:p-6">
      {/* Hidden audio elements */}
      <audio ref={localAudioRef} autoPlay muted />
      <audio ref={remoteAudioRef} autoPlay />

      <div className="w-full max-w-md">
        {error ? (
          <div className="glass-effect rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center animate-slide-up">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-text)] mb-2">Call Error</h3>
            <p className="text-[var(--color-text-muted)] mb-6">{error}</p>
            <button
              onClick={handleEndCall}
              className="w-full px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-lg font-medium"
            >
              Back to Chat
            </button>
          </div>
        ) : (
          <div className="glass-effect rounded-2xl sm:rounded-3xl p-5 sm:p-8 animate-slide-up">
            {/* Status Indicator */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="relative inline-block mb-5 sm:mb-6">
                {/* Animated pulse rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {isConnected && (
                    <>
                      <div className="absolute w-28 h-28 sm:w-32 sm:h-32 bg-blue-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                      <div className="absolute w-36 h-36 sm:w-40 sm:h-40 bg-blue-500/10 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
                    </>
                  )}
                </div>
                
                {/* Avatar */}
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl">
                  <User className="w-14 h-14 sm:w-16 sm:h-16 text-white" />
                </div>
              </div>

              {/* User Info */}
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-2 break-words">
                {remoteUsername}
              </h2>
              
              {/* Status Text */}
              <div className="flex items-center justify-center gap-2 mb-2">
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--color-text-muted)]" />
                    <p className="text-[var(--color-text-muted)]">Connecting...</p>
                  </>
                ) : isConnected ? (
                  <p className="text-[var(--color-accent)] font-medium">
                    Connected
                  </p>
                ) : (
                  <p className="text-[var(--color-text-muted)]">Waiting...</p>
                )}
              </div>

              {/* Call Duration */}
              {isConnected && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] rounded-full">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <p className="text-[var(--color-text)] font-mono text-sm">
                    {formatDuration(callDuration)}
                  </p>
                </div>
              )}
            </div>

            {/* Audio Status */}
            <div className="grid grid-cols-2 gap-3 mb-6 sm:mb-8">
              <div className="bg-[var(--color-surface)] rounded-xl p-3 sm:p-4 border border-[var(--color-border)]">
                <div className="flex items-center justify-center gap-2 mb-1">
                  {isAudioEnabled ? (
                    <Mic className="w-5 h-5 text-[var(--color-accent)]" />
                  ) : (
                    <MicOff className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <p className="text-xs text-center text-[var(--color-text-muted)]">
                  {isAudioEnabled ? 'Microphone On' : 'Muted'}
                </p>
              </div>

              <div className="bg-[var(--color-surface)] rounded-xl p-3 sm:p-4 border border-[var(--color-border)]">
                <div className="flex items-center justify-center gap-2 mb-1">
                  {isSpeakerEnabled ? (
                    <Volume2 className="w-5 h-5 text-[var(--color-accent)]" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <p className="text-xs text-center text-[var(--color-text-muted)]">
                  {isSpeakerEnabled ? 'Speaker On' : 'Speaker Off'}
                </p>
              </div>
            </div>

            {/* Call Controls */}
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <button
                onClick={toggleSpeaker}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
                  isSpeakerEnabled
                    ? 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
                    : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                }`}
                title={isSpeakerEnabled ? 'Mute Speaker' : 'Unmute Speaker'}
              >
                {isSpeakerEnabled ? (
                  <Volume2 className="w-6 h-6" />
                ) : (
                  <VolumeX className="w-6 h-6" />
                )}
              </button>

              <button
                onClick={handleEndCall}
                className="w-14 h-14 sm:w-16 sm:h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all scale-110 shadow-lg hover:shadow-xl"
                title="End Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>

              <button
                onClick={toggleAudio}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
                  isAudioEnabled
                    ? 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
                    : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                }`}
                title={isAudioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {isAudioEnabled ? (
                  <Mic className="w-6 h-6" />
                ) : (
                  <MicOff className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Connection Quality Indicator */}
            {isConnected && (
              <div className="mt-6 pt-6 border-t border-[var(--color-border)] text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1 h-3 bg-[var(--color-accent)] rounded-full" />
                    <div className="w-1 h-4 bg-[var(--color-accent)] rounded-full" />
                    <div className="w-1 h-5 bg-[var(--color-accent)] rounded-full" />
                  </div>
                  <p className="text-xs text-[var(--color-text-subtle)]">
                    Good connection quality
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: '1s' }} />
      </div>
    </div>
  );
}
