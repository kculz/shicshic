import { DataTypes, Model } from 'sequelize';
import type { Optional } from 'sequelize';
import sequelize from '../../config/database.js';

interface TripAttributes {
    id: string;
    passengerId: string;
    driverId?: string;
    pickupLocation: string;
    destinationLocation: string;
    status: 'requested' | 'accepted' | 'en_route' | 'boarding' | 'in_progress' | 'completed' | 'cancelled';
    fare?: number;
    isShared: boolean;
    start_time?: Date;
    end_time?: Date;
}

interface TripCreationAttributes extends Optional<TripAttributes, 'id' | 'status' | 'isShared'> { }

class Trip extends Model<TripAttributes, TripCreationAttributes> implements TripAttributes {
    public id!: string;
    public passengerId!: string;
    public driverId?: string;
    public pickupLocation!: string;
    public destinationLocation!: string;
    public status!: 'requested' | 'accepted' | 'en_route' | 'boarding' | 'in_progress' | 'completed' | 'cancelled';
    public fare?: number;
    public isShared!: boolean;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
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
        pickupLocation: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        destinationLocation: {
            type: DataTypes.STRING,
            allowNull: false,
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
    },
    {
        sequelize,
        tableName: 'trips',
    }
);

export default Trip;
