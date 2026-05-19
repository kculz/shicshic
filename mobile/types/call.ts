export type TripCallStatus = 'dialing' | 'active' | 'ended' | 'rejected' | 'missed';

export type TripCallParticipant = 'caller' | 'receiver';

export interface TripCallSessionDescription {
    type: 'offer' | 'answer' | 'pranswer' | 'rollback';
    sdp: string;
}

export interface TripCallIceCandidate {
    candidate: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
}

export interface TripCall {
    id: string;
    tripId: string;
    callerId: string;
    receiverId: string;
    callerName: string | null;
    receiverName: string | null;
    status: TripCallStatus;
    offerSdp: TripCallSessionDescription | null;
    answerSdp: TripCallSessionDescription | null;
    callerIceCandidates: TripCallIceCandidate[];
    receiverIceCandidates: TripCallIceCandidate[];
    connectedAt: string | null;
    endedAt: string | null;
    createdAt: string;
    updatedAt: string;
}
