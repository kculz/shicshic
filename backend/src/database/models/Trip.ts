import { DataTypes, Model } from 'sequelize';
import type { Optional } from 'sequelize';
import sequelize from '../../config/database.js';

interface TripAttributes {
    id: string;
    passengerId: string;
    driverId?: string;
    poolId?: string;
    pickupLocation: string;
    destinationLocation: string;
    pickupLat: number;
    pickupLon: number;
    destLat: number;
    destLon: number;
    status: 'requested' | 'accepted' | 'en_route' | 'boarding' | 'in_progress' | 'completed' | 'cancelled';
    fare?: number;
    isShared: boolean;
    seatsRequested: number;
    maxSeats: number;
    start_time?: Date;
    end_time?: Date;
}

interface TripCreationAttributes extends Optional<TripAttributes, 'id' | 'status' | 'isShared' | 'seatsRequested' | 'maxSeats' | 'poolId'> { }

class Trip extends Model<TripAttributes, TripCreationAttributes> implements TripAttributes {
    declare id: string;
    declare passengerId: string;
    declare driverId?: string;
    declare poolId?: string;
    declare pickupLocation: string;
    declare destinationLocation: string;
    declare pickupLat: number;
    declare pickupLon: number;
    declare destLat: number;
    declare destLon: number;
    declare status: 'requested' | 'accepted' | 'en_route' | 'boarding' | 'in_progress' | 'completed' | 'cancelled';
    declare fare?: number;
    declare isShared: boolean;
    declare seatsRequested: number;
    declare maxSeats: number;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

Trip.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        passengerId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        driverId: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        poolId: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        pickupLocation: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        destinationLocation: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        pickupLat: {
            type: DataTypes.DECIMAL(10, 7),
            allowNull: true,
        },
        pickupLon: {
            type: DataTypes.DECIMAL(10, 7),
            allowNull: true,
        },
        destLat: {
            type: DataTypes.DECIMAL(10, 7),
            allowNull: true,
        },
        destLon: {
            type: DataTypes.DECIMAL(10, 7),
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('requested', 'accepted', 'en_route', 'boarding', 'in_progress', 'completed', 'cancelled'),
            allowNull: false,
            defaultValue: 'requested',
        },
        fare: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        isShared: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        seatsRequested: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        maxSeats: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 4,
        },
    },
    {
        sequelize,
        tableName: 'trips',
    }
);

export default Trip;
