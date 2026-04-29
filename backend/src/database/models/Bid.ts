import { DataTypes, Model } from 'sequelize';
import type { Optional } from 'sequelize';
import sequelize from '../../config/database.js';

interface BidAttributes {
    id: string;
    tripId: string;
    driverId: string;
    driverName: string;
    driverPhone: string;
    driverRating: number;
    vehicleMake: string;
    vehicleModel?: string;
    vehiclePlate: string;
    vehicleColor?: string;
    offeredFare: number;
    currency: 'USD' | 'ZWL';
    status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
    estimatedArrivalMins: number;
}

interface BidCreationAttributes extends Optional<BidAttributes, 'id' | 'status'> { }

class Bid extends Model<BidAttributes, BidCreationAttributes> implements BidAttributes {
    declare id: string;
    declare tripId: string;
    declare driverId: string;
    declare driverName: string;
    declare driverPhone: string;
    declare driverRating: number;
    declare vehicleMake: string;
    declare vehicleModel?: string;
    declare vehiclePlate: string;
    declare vehicleColor?: string;
    declare offeredFare: number;
    declare currency: 'USD' | 'ZWL';
    declare status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
    declare estimatedArrivalMins: number;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

Bid.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        tripId: { type: DataTypes.UUID, allowNull: false },
        driverId: { type: DataTypes.UUID, allowNull: false },
        driverName: { type: DataTypes.STRING, allowNull: false },
        driverPhone: { type: DataTypes.STRING, allowNull: false },
        driverRating: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 4.5 },
        vehicleMake: { type: DataTypes.STRING, allowNull: false },
        vehicleModel: { type: DataTypes.STRING, allowNull: true },
        vehiclePlate: { type: DataTypes.STRING, allowNull: false },
        vehicleColor: { type: DataTypes.STRING, allowNull: true },
        offeredFare: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        currency: { type: DataTypes.ENUM('USD', 'ZWL'), allowNull: false, defaultValue: 'USD' },
        status: {
            type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'withdrawn'),
            allowNull: false,
            defaultValue: 'pending',
        },
        estimatedArrivalMins: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    },
    { sequelize, tableName: 'bids' }
);

export default Bid;
