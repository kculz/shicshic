import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

class Call extends Model {
    declare id: string;
    declare tripId: string;
    declare callerId: string;
    declare receiverId: string;
    declare status: 'dialing' | 'active' | 'ended' | 'rejected' | 'missed';
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
    status: {
        type: DataTypes.ENUM('dialing', 'active', 'ended', 'rejected', 'missed'),
        defaultValue: 'dialing',
    },
}, {
    sequelize,
    modelName: 'Call',
});

export default Call;
