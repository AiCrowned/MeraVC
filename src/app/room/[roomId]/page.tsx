'use client';
import { useEffect, useRef, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Mic, MicOff, Video, VideoOff,
    Monitor, MonitorOff, Phone,
    Users, MessageSquare, Copy, Send
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebRTC } from '@/contexts/WebRTCContext';
import { useRoom } from '@/hooks/useFirestore';

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
    const unwrappedParams = use(params);
    const roomId = unwrappedParams.roomId;

    const router = useRouter();
    const { user } = useAuth();

    const {
        localStream,
        remoteStreams,
        isAudioEnabled,
        isVideoEnabled,
        isScreenSharing,
        initializeMedia,
        cleanupMedia,
        toggleAudio,
        toggleVideo,
        startScreenShare,
        stopScreenShare,
        connectToPeer
    } = useWebRTC();

    const { room, joinRoom, leaveRoom, updateParticipantStatus } = useRoom(roomId);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const [showParticipants, setShowParticipants] = useState(false);
    const [showChat, setShowChat] = useState(false);

    useEffect(() => {
        if (!user) {
            router.push('/auth');
            return;
        }

        initializeMedia();

        return () => {
            cleanupMedia();
            if (room) {
                leaveRoom(roomId, user.uid);
            }
        };
    }, [user]);

    useEffect(() => {
        if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (user && room && localStream) {
            const participant = {
                uid: user.uid,
                displayName: user.displayName || 'Anonymous',
                photoURL: user.photoURL || '',
                peerId: user.uid,
                joinedAt: new Date().toISOString(),
                isMuted: !isAudioEnabled,
                isVideoOff: !isVideoEnabled
            };

            // Only join if not already in participants list to avoid loops/duplicates if implemented that way
            // But typically we update presence
            const isAlreadyParticipant = room.participants?.some(p => p.uid === user.uid);
            if (!isAlreadyParticipant) {
                joinRoom(roomId, participant);
            }

            // Connect to existing participants
            room.participants?.forEach((p) => {
                if (p.uid !== user.uid) {
                    connectToPeer(p.peerId);
                }
            });
        }
    }, [user, room, localStream]);

    const handleLeaveCall = async () => {
        if (user && room) {
            await leaveRoom(roomId, user.uid);
            cleanupMedia();
            router.push('/dashboard');
        }
    };

    const handleToggleAudio = () => {
        toggleAudio();
        if (user && room) {
            updateParticipantStatus(roomId, user.uid, {
                isMuted: isAudioEnabled // Note: isAudioEnabled is the OLD value before toggle? 
                // Logic in useWebRTC updates state, but React batching means we might send old value if not careful.
                // Ideally pass the !isAudioEnabled or wait for effect. 
                // For now trusting the context toggle updates immediately or we invert here.
                // Actually context toggle updates state asynchronously. 
                // Pass !isAudioEnabled for safety if sending immediately.
            });
        }
    };

    const handleToggleVideo = () => {
        toggleVideo();
        if (user && room) {
            updateParticipantStatus(roomId, user.uid, {
                isVideoOff: isVideoEnabled
            });
        }
    };

    return (
        <div className="h-screen bg-gray-900 flex flex-col">
            {/* Header */}
            <header className="bg-gray-800 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-white text-xl font-semibold">{room?.name || 'Room'}</h1>
                    <p className="text-gray-400 text-sm">
                        {room?.participants?.length || 0} participants
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setShowParticipants(!showParticipants);
                            setShowChat(false);
                        }}
                        className={`p-2 rounded-lg transition-colors ${showParticipants ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                    >
                        <Users className="w-5 h-5 text-white" />
                    </button>
                    <button
                        onClick={() => {
                            setShowChat(!showChat);
                            setShowParticipants(false);
                        }}
                        className={`p-2 rounded-lg transition-colors ${showChat ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                    >
                        <MessageSquare className="w-5 h-5 text-white" />
                    </button>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(roomId);
                            alert('Room ID copied!');
                        }}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Copy Room ID"
                    >
                        <Copy className="w-5 h-5 text-white" />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Video Grid */}
                <div className="flex-1 p-4 overflow-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full content-start">
                        {/* Local Video */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video"
                        >
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg">
                                <span className="text-white text-sm font-medium">
                                    You {!isVideoEnabled && '(Video Off)'}
                                </span>
                            </div>
                            {!isAudioEnabled && (
                                <div className="absolute top-4 right-4 bg-red-500 p-2 rounded-full">
                                    <MicOff className="w-4 h-4 text-white" />
                                </div>
                            )}
                        </motion.div>

                        {/* Remote Videos */}
                        {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
                            <RemoteVideo key={peerId} peerId={peerId} stream={stream} />
                        ))}
                    </div>
                </div>

                {/* Sidebar (Participants or Chat) */}
                {(showParticipants || showChat) && (
                    <motion.div
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 300, opacity: 0 }}
                        className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col shrink-0"
                    >
                        <div className="p-4 border-b border-gray-700">
                            <h3 className="text-white font-semibold">
                                {showParticipants ? 'Participants' : 'Chat'}
                            </h3>
                        </div>

                        {/* Participants List */}
                        {showParticipants && (
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {room?.participants?.map((p) => (
                                    <div key={p.uid} className="flex items-center gap-3">
                                        {p.photoURL ? (
                                            <img src={p.photoURL} alt={p.displayName} className="w-8 h-8 rounded-full" />
                                        ) : (
                                            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white text-xs">
                                                {p.displayName[0]}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm truncate">{p.displayName}</p>
                                            <p className="text-gray-400 text-xs">{p.uid === user?.uid ? '(You)' : ''}</p>
                                        </div>
                                        {p.isMuted && <MicOff className="w-4 h-4 text-red-400" />}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Chat */}
                        {showChat && (
                            <ChatPanel roomId={roomId} user={user} />
                        )}
                    </motion.div>
                )}
            </div>

            {/* Controls */}
            <div className="bg-gray-800 px-6 py-6 shrink-0">
                <div className="flex items-center justify-center gap-4">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleToggleAudio}
                        className={`p-4 rounded-full ${isAudioEnabled
                            ? 'bg-gray-700 hover:bg-gray-600'
                            : 'bg-red-500 hover:bg-red-600'
                            } transition-colors`}
                    >
                        {isAudioEnabled ? (
                            <Mic className="w-6 h-6 text-white" />
                        ) : (
                            <MicOff className="w-6 h-6 text-white" />
                        )}
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleToggleVideo}
                        className={`p-4 rounded-full ${isVideoEnabled
                            ? 'bg-gray-700 hover:bg-gray-600'
                            : 'bg-red-500 hover:bg-red-600'
                            } transition-colors`}
                    >
                        {isVideoEnabled ? (
                            <Video className="w-6 h-6 text-white" />
                        ) : (
                            <VideoOff className="w-6 h-6 text-white" />
                        )}
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                        className={`p-4 rounded-full ${isScreenSharing
                            ? 'bg-blue-500 hover:bg-blue-600'
                            : 'bg-gray-700 hover:bg-gray-600'
                            } transition-colors`}
                    >
                        {isScreenSharing ? (
                            <MonitorOff className="w-6 h-6 text-white" />
                        ) : (
                            <Monitor className="w-6 h-6 text-white" />
                        )}
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleLeaveCall}
                        className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                    >
                        <Phone className="w-6 h-6 text-white rotate-135" />
                    </motion.button>
                </div>
            </div>
        </div>
    );
}

function RemoteVideo({ peerId, stream }: { peerId: string; stream: MediaStream }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video"
        >
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg">
                <span className="text-white text-sm font-medium">Participant</span>
            </div>
        </motion.div>
    );
}

function ChatPanel({ roomId, user }: { roomId: string; user: any }) {
    const { messages, sendMessage } = useRoom(roomId);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        try {
            await sendMessage(roomId, user.uid, user.displayName || 'Anonymous', newMessage.trim());
            setNewMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                    const isMe = msg.senderId === user?.uid;
                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] px-3 py-2 rounded-lg ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                <p className="text-xs opacity-75 mb-1">{msg.senderName}</p>
                                <p className="text-sm break-words">{msg.text}</p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="p-4 border-t border-gray-700 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-700 border-none rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-2 bg-blue-600 rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors"
                >
                    <Send className="w-5 h-5 text-white" />
                </button>
            </form>
        </div>
    );
}
