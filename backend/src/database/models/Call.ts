import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

export interface CallSessionDescription {
    type: 'offer' | 'answer' | 'pranswer' | 'rollback';
    sdp: string;
}

export interface CallIceCandidate {
    candidate: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
}

class Call extends Model {
    declare id: string;
    declare tripId: string;
    declare callerId: string;
    declare receiverId: string;
    declare callerName: string | null;
    declare receiverName: string | null;
    declare status: 'dialing' | 'active' | 'ended' | 'rejected' | 'missed';
    declare offerSdp: CallSessionDescription | null;
    declare answerSdp: CallSessionDescription | null;
    declare callerIceCandidates: CallIceCandidate[];
    declare receiverIceCandidates: CallIceCandidate[];
    declare connectedAt: Date | null;
    declare endedAt: Date | null;
    declare createdAt: Date;
    declare updatedAt: Date;
}

Call.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    tripId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    callerId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    receiverId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    callerName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    receiverName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('dialing', 'active', 'ended', 'rejected', 'missed'),
        defaultValue: 'dialing',
    },
    offerSdp: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    answerSdp: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    callerIceCandidates: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
    },
    receiverIceCandidates: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
    },
    connectedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    endedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize,
    modelName: 'Call',
});

export default Call;
