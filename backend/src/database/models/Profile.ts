import { DataTypes, Model } from 'sequelize';
import type { Optional } from 'sequelize';
import sequelize from '../../config/database.js';
import User from './User.js';

export interface SavedPlace {
    id: string;
    label: string;
    address: string;
    lat: number;
    lon: number;
}

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
    searchRadius: number;
    homeAddress?: string | null;
    homeLat?: number | null;
    homeLon?: number | null;
    workAddress?: string | null;
    workLat?: number | null;
    workLon?: number | null;
    savedPlaces: SavedPlace[];
    createdAt?: Date;
    updatedAt?: Date;
}

interface ProfileCreationAttributes extends Optional<ProfileAttributes, 'id' | 'kycStatus' | 'searchRadius' | 'savedPlaces'> { }

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
    declare searchRadius: number;
    declare homeAddress?: string | null;
    declare homeLat?: number | null;
    declare homeLon?: number | null;
    declare workAddress?: string | null;
    declare workLat?: number | null;
    declare workLon?: number | null;
    declare savedPlaces: SavedPlace[];

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
        searchRadius: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 5, // 5km default
        },
        homeAddress: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        homeLat: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        homeLon: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        workAddress: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        workLat: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        workLon: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        savedPlaces: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: [],
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
