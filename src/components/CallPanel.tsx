"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";

type SignalType = "offer" | "answer" | "candidate";

type SignalMessage = {
    roomId: string;
    senderId: string;
    type: SignalType;
    payload: any;
};

const SIGNAL_CHANNEL = "yourtube-webrtc-signal";

// Basic in-browser signaling using BroadcastChannel so two tabs can talk without a server.
// Swap this with WebSocket/Socket.io for real multi-user rooms.
export default function CallPanel() {
    const [roomId, setRoomId] = useState("demo-room");
    const [joined, setJoined] = useState(false);
    const [isCalling, setIsCalling] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [connectionState, setConnectionState] = useState("disconnected");

    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const screenTrackRef = useRef<MediaStreamTrack | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const channelRef = useRef<BroadcastChannel | null>(null);

    const senderId = useMemo(() => crypto.randomUUID(), []);

    const sendSignal = useCallback(
        (type: SignalType, payload: any) => {
            if (!channelRef.current || !joined) return;
            // Clone payload to avoid DataCloneError (e.g., RTCIceCandidate not serializable)
            const safePayload =
                type === "candidate" && payload?.toJSON ? payload.toJSON() : JSON.parse(JSON.stringify(payload));
            const message: SignalMessage = { roomId, senderId, type, payload: safePayload };
            channelRef.current.postMessage(message);
        },
        [roomId, senderId, joined]
    );

    const setupPeerConnection = useCallback(() => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal("candidate", event.candidate);
            }
        };

        pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            setConnectionState(state);
            if (state === "disconnected" || state === "failed") {
                toast.error("Call disconnected");
            }
        };

        pc.ontrack = (event) => {
            const [stream] = event.streams;
            if (!stream) return;
            remoteStreamRef.current = stream;
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
            }
        };

        pcRef.current = pc;
        return pc;
    }, [sendSignal]);

    const ensureLocalMedia = useCallback(async () => {
        if (localStreamRef.current) return localStreamRef.current;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            return stream;
        } catch (err) {
            console.error("Failed to get user media", err);
            toast.error("Camera/mic permission denied");
            throw err;
        }
    }, []);

    const startCall = useCallback(async () => {
        setIsCalling(true);
        const pc = pcRef.current || setupPeerConnection();
        const localStream = await ensureLocalMedia();
        localStream.getTracks().forEach((track) => pc?.addTrack(track, localStream));

        const offer = await pc!.createOffer();
        await pc!.setLocalDescription(offer);
        sendSignal("offer", offer);
    }, [ensureLocalMedia, sendSignal, setupPeerConnection]);

    const handleOffer = useCallback(
        async (payload: any) => {
            const pc = pcRef.current || setupPeerConnection();
            await ensureLocalMedia();
            const localStream = localStreamRef.current;
            localStream?.getTracks().forEach((track) => pc?.addTrack(track, localStream));

            await pc!.setRemoteDescription(new RTCSessionDescription(payload));
            const answer = await pc!.createAnswer();
            await pc!.setLocalDescription(answer);
            sendSignal("answer", answer);
            setIsCalling(true);
        },
        [ensureLocalMedia, sendSignal, setupPeerConnection]
    );

    const handleAnswer = useCallback(async (payload: any) => {
        if (!pcRef.current) return;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload));
    }, []);

    const handleCandidate = useCallback(async (payload: any) => {
        if (!pcRef.current) return;
        try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload));
        } catch (err) {
            console.error("Error adding ICE candidate", err);
        }
    }, []);

    const joinRoom = useCallback(() => {
        if (joined) return;
        if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
            toast.error("BroadcastChannel unsupported in this browser");
            return;
        }
        const channel = new BroadcastChannel(SIGNAL_CHANNEL);
        channel.onmessage = (event) => {
            const message: SignalMessage = event.data;
            if (!message || message.roomId !== roomId || message.senderId === senderId) return;
            if (message.type === "offer") handleOffer(message.payload);
            if (message.type === "answer") handleAnswer(message.payload);
            if (message.type === "candidate") handleCandidate(message.payload);
        };
        channelRef.current = channel;
        setJoined(true);
        toast.success(`Joined room ${roomId}. Open another tab with same room to test.`);
    }, [handleAnswer, handleCandidate, handleOffer, joined, roomId, senderId]);

    const leaveRoom = useCallback(() => {
        setJoined(false);
        setIsCalling(false);
        setConnectionState("disconnected");

        channelRef.current?.close();
        channelRef.current = null;

        recorderRef.current?.stop();
        recorderRef.current = null;
        recordedChunksRef.current = [];

        pcRef.current?.getSenders().forEach((s) => s.track?.stop());
        pcRef.current?.getReceivers().forEach((r) => r.track?.stop());
        pcRef.current?.close();
        pcRef.current = null;

        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        remoteStreamRef.current = null;

        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    }, []);

    const startScreenShare = useCallback(async () => {
        try {
            const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({
                video: true,
            });
            const screenTrack = displayStream.getVideoTracks()[0];
            screenTrackRef.current = screenTrack;
            const sender = pcRef.current
                ?.getSenders()
                .find((s) => s.track && s.track.kind === "video");
            if (sender) {
                await sender.replaceTrack(screenTrack);
            }
            screenTrack.onended = () => {
                if (localStreamRef.current) {
                    const originalTrack = localStreamRef.current.getVideoTracks()[0];
                    if (sender && originalTrack) sender.replaceTrack(originalTrack);
                }
                screenTrackRef.current = null;
            };
        } catch (err) {
            console.error("Screen share failed", err);
            toast.error("Screen share blocked");
        }
    }, []);

    const startRecording = useCallback(() => {
        const streamToRecord = remoteStreamRef.current || localStreamRef.current;
        if (!streamToRecord) {
            toast.error("Nothing to record yet");
            return;
        }
        try {
            recordedChunksRef.current = [];
            const recorder = new MediaRecorder(streamToRecord, { mimeType: "video/webm;codecs=vp9" });
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) recordedChunksRef.current.push(event.data);
            };
            recorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `call-recording-${Date.now()}.webm`;
                a.click();
                URL.revokeObjectURL(url);
            };
            recorder.start();
            recorderRef.current = recorder;
            setIsRecording(true);
            toast.success("Recording started");
        } catch (err) {
            console.error("Recording failed", err);
            toast.error("Could not start recording");
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
            recorderRef.current.stop();
        }
        setIsRecording(false);
    }, []);

    useEffect(() => {
        return () => {
            leaveRoom();
        };
    }, [leaveRoom]);

    return (
        <div className="space-y-4 rounded-lg border border-neutral-800/40 bg-neutral-900/60 p-4 text-white">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Room ID"
                    className="bg-neutral-800 border-neutral-700 text-white"
                />
                <div className="flex gap-2">
                    <Button onClick={joinRoom} disabled={joined} className="bg-emerald-600 hover:bg-emerald-500">
                        Join
                    </Button>
                    <Button onClick={leaveRoom} variant="secondary" className="bg-neutral-700 hover:bg-neutral-600">
                        Leave
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button onClick={startCall} disabled={!joined || isCalling} className="bg-indigo-600 hover:bg-indigo-500">
                    Start Call
                </Button>
                <Button onClick={startScreenShare} disabled={!isCalling} className="bg-amber-600 hover:bg-amber-500">
                    Share Screen
                </Button>
                {!isRecording ? (
                    <Button onClick={startRecording} disabled={!isCalling} className="bg-rose-600 hover:bg-rose-500">
                        Start Recording
                    </Button>
                ) : (
                    <Button onClick={stopRecording} className="bg-rose-800 hover:bg-rose-700">
                        Stop Recording
                    </Button>
                )}
            </div>

            <div className="text-sm text-neutral-300">
                Status: {connectionState} {isRecording ? "• Recording" : ""}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <div className="mb-1 text-xs text-neutral-400">You</div>
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full rounded-lg bg-black" />
                </div>
                <div>
                    <div className="mb-1 text-xs text-neutral-400">Friend</div>
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full rounded-lg bg-black" />
                </div>
            </div>

            <p className="text-xs text-neutral-400">
                Demo signaling uses BroadcastChannel. Open two tabs, join the same room, then Start Call from one tab to connect.
                Replace signaling with WebSocket for real multi-user support.
            </p>
        </div>
    );
}

