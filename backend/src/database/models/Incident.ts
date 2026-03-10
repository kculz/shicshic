import { DataTypes, Model } from 'sequelize';
import type { Optional } from 'sequelize';
import sequelize from '../../config/database.js';

interface IncidentAttributes {
    id: string;
    tripId: string;
    reporterId: string;
    category: 'theft' | 'assault' | 'harassment' | 'accident' | 'damage' | 'fraud' | 'unsafe_driving' | 'other';
    description: string;
    status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
    evidenceUrls?: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

interface IncidentCreationAttributes extends Optional<IncidentAttributes, 'id' | 'status'> { }

class Incident extends Model<IncidentAttributes, IncidentCreationAttributes> implements IncidentAttributes {
    public id!: string;
    public tripId!: string;
    public reporterId!: string;
    public category!: 'theft' | 'assault' | 'harassment' | 'accident' | 'damage' | 'fraud' | 'unsafe_driving' | 'other';
    public description!: string;
    public status!: 'pending' | 'investigating' | 'resolved' | 'dismissed';
    public evidenceUrls?: string[];

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
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
            allowNull: false,
        },
        reporterId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        category: {
            type: DataTypes.ENUM('theft', 'assault', 'harassment', 'accident', 'damage', 'fraud', 'unsafe_driving', 'other'),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('pending', 'investigating', 'resolved', 'dismissed'),
            allowNull: false,
            defaultValue: 'pending',
        },
        evidenceUrls: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
        },
    },
    {
        sequelize,
        tableName: 'incidents',
    }
);

export default Incident;
