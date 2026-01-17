'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Video, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRoom } from '@/hooks/useFirestore';

export default function Dashboard() {
    const router = useRouter();
    const { user, signOut } = useAuth();
    const { createRoom, checkRoomExists } = useRoom();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [roomName, setRoomName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [joinError, setJoinError] = useState('');

    const handleCreateRoom = async () => {
        if (!user || !roomName.trim()) return;

        setLoading(true);
        try {
            const roomId = await createRoom(
                user.uid,
                user.displayName || 'Anonymous',
                roomName
            );
            router.push(`/room/${roomId}`);
        } catch (error) {
            console.error('Error creating room:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!roomCode.trim()) return;

        setLoading(true);
        setJoinError('');

        try {
            const exists = await checkRoomExists(roomCode.trim());
            if (exists) {
                router.push(`/room/${roomCode.trim()}`);
            } else {
                setJoinError('Room not found. Please check the code.');
            }
        } catch (error) {
            console.error('Error joining room:', error);
            setJoinError('Failed to join room. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Video className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            MeraVC
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            {user?.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt={user.displayName || 'User'}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                    <User className="w-6 h-6 text-gray-500" />
                                </div>
                            )}
                            <span className="text-gray-700 font-medium">
                                {user?.displayName}
                            </span>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <LogOut className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-4xl mx-auto"
                >
                    <h1 className="text-4xl font-bold mb-8 text-gray-800">
                        Welcome back, {user?.displayName?.split(' ')[0]}!
                    </h1>

                    <div className="grid md:grid-cols-2 gap-6 mb-12">
                        {/* Create Room Card */}
                        <motion.div
                            whileHover={{ y: -4 }}
                            className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 cursor-pointer"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                                <Plus className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-semibold mb-2 text-gray-800">
                                Create Room
                            </h2>
                            <p className="text-gray-600">
                                Start a new video call and invite others to join
                            </p>
                        </motion.div>

                        {/* Join Room Card */}
                        <motion.div
                            whileHover={{ y: -4 }}
                            className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200"
                        >
                            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center mb-4">
                                <Video className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                                Join Room
                            </h2>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Enter room code"
                                    value={roomCode}
                                    onChange={(e) => setRoomCode(e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleJoinRoom}
                                    disabled={!roomCode.trim() || loading}
                                    className="px-6 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
                                >
                                    {loading ? 'Joining...' : 'Join'}
                                </button>
                            </div>
                            {joinError && (
                                <p className="text-red-500 text-sm mt-2">{joinError}</p>
                            )}
                        </motion.div>
                    </div>
                </motion.div>
            </main>

            {/* Create Room Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl p-8 max-w-md w-full"
                    >
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">
                            Create New Room
                        </h2>
                        <input
                            type="text"
                            placeholder="Enter room name"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateRoom}
                                disabled={!roomName.trim() || loading}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
                            >
                                {loading ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
