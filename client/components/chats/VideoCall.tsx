'use client';

import { useState, useEffect, useRef } from 'react';
import { getSocket } from '@/lib/Socket';
import { WebRTCManager } from '@/lib/Webrtc';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff,
  Monitor,
  Loader2
} from 'lucide-react';


interface VideoCallProps {
  localUserId: string;
  remoteUserId: string;
  remoteUsername: string;
  initialOffer?: RTCSessionDescriptionInit;
  onEndCall: () => void;
}

export default function VideoCall({
  localUserId,
  remoteUserId,
  remoteUsername,
  initialOffer,
  onEndCall
}: VideoCallProps) {
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socket = getSocket();

  useEffect(() => {
    const manager = new WebRTCManager(socket);
    webrtcManagerRef.current = manager;

    const setupCall = async () => {
      try {
        // Get local stream
        const localStream = await manager.getLocalStream(true, true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        // Create peer connection
        await manager.createPeerConnection(
          remoteUserId,
          (remoteStream) => {
            console.log('Received remote stream');
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
            setIsConnected(true);
            setIsConnecting(false);
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
            callType: 'video'
          });
        }

        setIsConnecting(false);
      } catch (err) {
        console.error('Error setting up call:', err);
        setError('Failed to setup video call. Please check permissions.');
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

  const toggleVideo = () => {
    if (webrtcManagerRef.current && localVideoRef.current) {
      const videoTrack = (localVideoRef.current.srcObject as MediaStream)
        ?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (webrtcManagerRef.current && localVideoRef.current) {
      const audioTrack = (localVideoRef.current.srcObject as MediaStream)
        ?.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const handleEndCall = () => {
    socket.emit('webrtc:end-call', { targetUserId: remoteUserId });
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.closeAllConnections();
    }
    onEndCall();
  };

  return (
    <div className="h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Header */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--color-text)]">Video Call</h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                {isConnecting ? 'Connecting...' : isConnected ? `Connected with ${remoteUsername}` : 'Waiting...'}
              </p>
            </div>
          </div>
          
          {isConnecting && (
            <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Establishing connection...</span>
            </div>
          )}
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-6 relative">
        {error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <VideoOff className="w-10 h-10 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--color-text)] mb-2">Call Error</h3>
              <p className="text-[var(--color-text-muted)] mb-6">{error}</p>
              <button
                onClick={handleEndCall}
                className="px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-lg font-medium"
              >
                Back to Chat
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Remote Video */}
            <div className="relative bg-black rounded-2xl overflow-hidden border-2 border-[var(--color-border)]">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {!isConnected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-[var(--color-surface)] rounded-full flex items-center justify-center mx-auto mb-4">
                      <Monitor className="w-12 h-12 text-[var(--color-text-muted)]" />
                    </div>
                    <p className="text-white font-medium text-lg">{remoteUsername}</p>
                    <p className="text-white/60 text-sm mt-1">Connecting...</p>
                  </div>
                </div>
              )}
              <div className="absolute top-4 left-4 px-3 py-2 bg-black/70 backdrop-blur-sm rounded-lg">
                <p className="text-white text-sm font-medium">{remoteUsername}</p>
              </div>
            </div>

            {/* Local Video */}
            <div className="relative bg-black rounded-2xl overflow-hidden border-2 border-[var(--color-accent)]">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-[var(--color-surface)] rounded-full flex items-center justify-center mx-auto mb-3">
                      <VideoOff className="w-10 h-10 text-[var(--color-text-muted)]" />
                    </div>
                    <p className="text-white text-sm">Camera Off</p>
                  </div>
                </div>
              )}
              <div className="absolute top-4 left-4 px-3 py-2 bg-black/70 backdrop-blur-sm rounded-lg">
                <p className="text-white text-sm font-medium">You</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-[var(--color-surface)] border-t border-[var(--color-border)] px-6 py-6">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleAudio}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isAudioEnabled
                ? 'bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>

          <button
            onClick={handleEndCall}
            className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all scale-110"
            title="End Call"
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isVideoEnabled
                ? 'bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
}