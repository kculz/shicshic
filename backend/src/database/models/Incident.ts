import { DataTypes, Model } from 'sequelize';
import type { Optional } from 'sequelize';
import sequelize from '../../config/database.js';
import User from './User.js';
import Trip from './Trip.js';

interface IncidentAttributes {
    id: string;
    tripId?: string | null;
    reporterId: string;
    type: 'accident' | 'robbery' | 'kidnapping' | 'harassment' | 'theft' | 'assault' | 'damage' | 'fraud' | 'unsafe-driving' | 'other';
    description: string;
    locationLat?: number | null;
    locationLon?: number | null;
    status: 'pending' | 'investigating' | 'resolved';
    createdAt?: Date;
    updatedAt?: Date;
}

interface IncidentCreationAttributes extends Optional<IncidentAttributes, 'id' | 'status'> { }

class Incident extends Model<IncidentAttributes, IncidentCreationAttributes> implements IncidentAttributes {
    declare id: string;
    declare tripId?: string | null;
    declare reporterId: string;
    declare type: 'accident' | 'robbery' | 'kidnapping' | 'harassment' | 'theft' | 'assault' | 'damage' | 'fraud' | 'unsafe-driving' | 'other';
    declare description: string;
    declare locationLat?: number | null;
    declare locationLon?: number | null;
    declare status: 'pending' | 'investigating' | 'resolved';

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

Incident.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        tripId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'trips',
                key: 'id',
            },
        },
        reporterId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        type: {
            type: DataTypes.ENUM('accident', 'robbery', 'kidnapping', 'harassment', 'theft', 'assault', 'damage', 'fraud', 'unsafe-driving', 'other'),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        locationLat: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        locationLon: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('pending', 'investigating', 'resolved'),
            allowNull: false,
            defaultValue: 'pending',
        },
    },
    {
        sequelize,
        tableName: 'incidents',
    }
);

// Associations
Incident.belongsTo(User, { as: 'reporter', foreignKey: 'reporterId' });
Incident.belongsTo(Trip, { as: 'trip', foreignKey: 'tripId' });

export default Incident;
