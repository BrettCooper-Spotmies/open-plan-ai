import { create } from 'zustand';

export type CallState = 'idle' | 'outgoing' | 'incoming' | 'active';
export type CallType = 'audio' | 'video';

interface CallStoreState {
  callState: CallState;
  callType: CallType | null;
  remoteUserId: string | null;
  remoteUserName: string | null;
  remoteUserConnected: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  callDuration: number; // in seconds

  startCall: (userId: string, userName: string, type: CallType, recipientConnected: boolean) => void;
  receiveCall: (userId: string, userName: string, type: CallType) => void;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  incrementDuration: () => void;
  simulateIncomingCall: (userId: string, userName: string, type: CallType) => void;
}

export const useCallStore = create<CallStoreState>((set) => ({
  callState: 'idle',
  callType: null,
  remoteUserId: null,
  remoteUserName: null,
  remoteUserConnected: true,
  isMuted: false,
  isCameraOff: false,
  callDuration: 0,

  startCall: (userId, userName, type, recipientConnected) =>
    set({
      callState: 'outgoing',
      callType: type,
      remoteUserId: userId,
      remoteUserName: userName,
      remoteUserConnected: recipientConnected,
      isMuted: false,
      isCameraOff: false,
      callDuration: 0,
    }),

  receiveCall: (userId, userName, type) =>
    set({
      callState: 'incoming',
      callType: type,
      remoteUserId: userId,
      remoteUserName: userName,
      remoteUserConnected: true,
      isMuted: false,
      isCameraOff: false,
      callDuration: 0,
    }),

  acceptCall: () =>
    set({
      callState: 'active',
      callDuration: 0,
    }),

  declineCall: () =>
    set({
      callState: 'idle',
      callType: null,
      remoteUserId: null,
      remoteUserName: null,
      callDuration: 0,
    }),

  endCall: () =>
    set({
      callState: 'idle',
      callType: null,
      remoteUserId: null,
      remoteUserName: null,
      callDuration: 0,
    }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleCamera: () => set((state) => ({ isCameraOff: !state.isCameraOff })),
  incrementDuration: () => set((state) => ({ callDuration: state.callDuration + 1 })),

  simulateIncomingCall: (userId, userName, type) =>
    set({
      callState: 'incoming',
      callType: type,
      remoteUserId: userId,
      remoteUserName: userName,
      remoteUserConnected: true,
      isMuted: false,
      isCameraOff: false,
      callDuration: 0,
    }),
}));
