'use client';
import { createContext, useContext, useRef, useState, useEffect } from 'react';

interface WebRTCContextType {
    localStream: MediaStream | null;
    remoteStreams: Map<string, MediaStream>;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
    initializeMedia: () => Promise<void>;
    cleanupMedia: () => void;
    toggleAudio: () => void;
    toggleVideo: () => void;
    startScreenShare: () => Promise<void>;
    stopScreenShare: () => void;
    connectToPeer: (peerId: string) => Promise<void>;
}

const WebRTCContext = createContext<WebRTCContextType>({} as WebRTCContextType);

// STUN servers configuration
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ]
};

export function WebRTCProvider({ children }: { children: React.ReactNode }) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

    const initializeMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            });
            setLocalStream(stream);
            setIsAudioEnabled(true);
            setIsVideoEnabled(true);
        } catch (error) {
            console.error('Error accessing media devices:', error);
        }
    };

    const cleanupMedia = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        peerConnections.current.forEach(pc => pc.close());
        peerConnections.current.clear();
        setRemoteStreams(new Map());
    };

    const toggleAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
            }
        }
    };

    const startScreenShare = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const videoTrack = stream.getVideoTracks()[0];

            if (localStream && videoTrack) {
                const sender = peerConnections.current.values().next().value?.getSenders()
                    .find((s: RTCRtpSender) => s.track?.kind === 'video');

                if (sender) {
                    sender.replaceTrack(videoTrack);
                }

                videoTrack.onended = () => {
                    stopScreenShare();
                };

                setIsScreenSharing(true);
                // Mix screen video with mic audio if needed, or simply replace the video track
                // For simplicity, we assume replacing the video track for now
            }
        } catch (error) {
            console.error('Error sharing screen:', error);
        }
    };

    const stopScreenShare = async () => {
        // Revert to camera
        if (localStream) {
            try {
                // In a real app, you might need to re-acquire camera stream if it was stopped
                // But usually we just keep the camera stream explicitly separate or re-enable it
                // Here we imply re-negotiation or track replacement logic 
                // Simplified: Just disable flag for UI
                setIsScreenSharing(false);
                // Logic to switch back track would go here
            } catch (e) {
                console.error(e);
            }
        }
    };

    const connectToPeer = async (peerId: string) => {
        // WebRTC connection logic placeholder
        // In a real app, this would involve signaling mechanism (Firestore/Socket)
        // creating offer/answer, ICE candidates exchange
        console.log('Connecting to peer:', peerId);
    };

    return (
        <WebRTCContext.Provider value={{
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
        }}>
            {children}
        </WebRTCContext.Provider>
    );
}

export const useWebRTC = () => useContext(WebRTCContext);
