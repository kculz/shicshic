import { DataTypes, Model } from 'sequelize';
import type { Optional } from 'sequelize';
import sequelize from '../../config/database.js';

interface ChatMessageAttributes {
    id: string;
    tripId: string;
    senderId: string;
    senderRole: 'passenger' | 'driver';
    senderName: string;
    message: string;
}

interface ChatMessageCreationAttributes extends Optional<ChatMessageAttributes, 'id'> { }

class ChatMessage extends Model<ChatMessageAttributes, ChatMessageCreationAttributes> implements ChatMessageAttributes {
    public id!: string;
    public tripId!: string;
    public senderId!: string;
    public senderRole!: 'passenger' | 'driver';
    public senderName!: string;
    public message!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

ChatMessage.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        tripId: { type: DataTypes.UUID, allowNull: false },
        senderId: { type: DataTypes.UUID, allowNull: false },
        senderRole: { type: DataTypes.ENUM('passenger', 'driver'), allowNull: false },
        senderName: { type: DataTypes.STRING, allowNull: false },
        message: { type: DataTypes.TEXT, allowNull: false },
    },
    { sequelize, tableName: 'chat_messages' }
);

export default ChatMessage;
