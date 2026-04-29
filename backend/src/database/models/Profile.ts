import { DataTypes, Model } from 'sequelize';
import type { Optional } from 'sequelize';
import sequelize from '../../config/database.js';
import User from './User.js';

interface ProfileAttributes {
    id: string;
    userId: string;
    fullName?: string | null;
    idCardFrontUrl?: string | null;
    idCardBackUrl?: string | null;
    selfieUrl?: string | null;
    kycStatus: 'pending' | 'approved' | 'rejected';
    vehicleMake?: string | null;
    vehicleModel?: string | null;
    vehiclePlate?: string | null;
    vehicleColor?: string | null;
    rejectionReason?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ProfileCreationAttributes extends Optional<ProfileAttributes, 'id' | 'kycStatus'> { }

class Profile extends Model<ProfileAttributes, ProfileCreationAttributes> implements ProfileAttributes {
    declare id: string;
    declare userId: string;
    declare fullName?: string | null;
    declare idCardFrontUrl?: string | null;
    declare idCardBackUrl?: string | null;
    declare selfieUrl?: string | null;
    declare kycStatus: 'pending' | 'approved' | 'rejected';
    declare vehicleMake?: string | null;
    declare vehicleModel?: string | null;
    declare vehiclePlate?: string | null;
    declare vehicleColor?: string | null;
    declare rejectionReason?: string | null;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

Profile.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        fullName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        idCardFrontUrl: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        idCardBackUrl: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        selfieUrl: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        kycStatus: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            allowNull: false,
            defaultValue: 'pending',
        },
        rejectionReason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        vehicleMake: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        vehicleModel: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        vehiclePlate: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        vehicleColor: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'profiles',
    }
);

// Define associations
User.hasOne(Profile, { foreignKey: 'userId' });
Profile.belongsTo(User, { foreignKey: 'userId' });

export default Profile;
