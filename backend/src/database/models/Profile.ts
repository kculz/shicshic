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
    rejectionReason?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ProfileCreationAttributes extends Optional<ProfileAttributes, 'id' | 'kycStatus'> { }

class Profile extends Model<ProfileAttributes, ProfileCreationAttributes> implements ProfileAttributes {
    public id!: string;
    public userId!: string;
    public fullName?: string | null;
    public idCardFrontUrl?: string | null;
    public idCardBackUrl?: string | null;
    public selfieUrl?: string | null;
    public kycStatus!: 'pending' | 'approved' | 'rejected';
    public rejectionReason?: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
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
