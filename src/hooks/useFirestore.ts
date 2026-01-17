'use client';
import { useState, useEffect } from 'react';
import {
    collection,
    addDoc,
    doc,
    onSnapshot,
    updateDoc,
    arrayUnion,
    arrayRemove,
    serverTimestamp,
    getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Participant {
    uid: string;
    displayName: string;
    photoURL: string;
    peerId: string;
    joinedAt: string;
    isMuted: boolean;
    isVideoOff: boolean;
}

interface Room {
    id: string;
    hostId: string;
    name: string;
    createdAt: unknown;
    participants: Participant[];
    participantIds: string[];
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: any;
}

export function useRoom(roomId?: string) {
    const [room, setRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!roomId) {
            // Defer state update to avoid synchronous render warning
            const timer = setTimeout(() => setLoading(false), 0);
            return () => clearTimeout(timer);
        }

        // 1. Room Listener
        const unsubscribeRoom = onSnapshot(doc(db, 'rooms', roomId), (doc) => {
            if (doc.exists()) {
                setRoom({ id: doc.id, ...doc.data() } as Room);
            } else {
                setRoom(null);
            }
            setLoading(false);
        });

        // 2. Messages Listener (Subcollection)
        const q = collection(db, 'rooms', roomId, 'messages');
        // We can sort by timestamp if we want ordered messages, but standard snapshot is okay for now
        // or add orderBy('timestamp', 'asc') if we indexed it.
        const unsubscribeMessages = onSnapshot(q, (snapshot) => {
            const msgs: ChatMessage[] = [];
            snapshot.forEach((doc) => {
                msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
            });
            // Client-side sort to avoid index requirement for now
            msgs.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
            setMessages(msgs);
        });

        return () => {
            unsubscribeRoom();
            unsubscribeMessages();
        };
    }, [roomId]);

    const createRoom = async (userId: string, userName: string, roomName: string) => {
        const roomRef = await addDoc(collection(db, 'rooms'), {
            hostId: userId,
            name: roomName,
            createdAt: serverTimestamp(),
            participants: [],
            participantIds: []
        });
        return roomRef.id;
    };

    const checkRoomExists = async (roomIdToCheck: string) => {
        try {
            const roomRef = doc(db, 'rooms', roomIdToCheck);
            const roomSnap = await getDoc(roomRef);
            return roomSnap.exists();
        } catch (e) {
            console.error('Error checking room existence:', e);
            return false;
        }
    };

    const joinRoom = async (roomId: string, participant: Participant) => {
        const roomRef = doc(db, 'rooms', roomId);
        await updateDoc(roomRef, {
            participants: arrayUnion(participant),
            participantIds: arrayUnion(participant.uid)
        });
    };

    const sendMessage = async (roomId: string, senderId: string, senderName: string, text: string) => {
        await addDoc(collection(db, 'rooms', roomId, 'messages'), {
            senderId,
            senderName,
            text,
            timestamp: serverTimestamp()
        });
    };

    const leaveRoom = async (roomId: string, userId: string) => {
        console.log('leaveRoom placeholder', roomId, userId);
    };

    const updateParticipantStatus = async (roomId: string, userId: string, status: Partial<Participant>) => {
        console.log('updateParticipantStatus placeholder', roomId, userId, status);
    };

    return {
        room,
        messages,
        loading,
        createRoom,
        joinRoom,
        leaveRoom,
        updateParticipantStatus,
        sendMessage,
        checkRoomExists
    };
}
