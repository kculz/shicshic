import { DataTypes, Model } from 'sequelize';
import type { Optional } from 'sequelize';
import sequelize from '../../config/database.js';

interface TransactionAttributes {
    id: string;
    userId: string;
    amount: number;
    currency: 'USD' | 'ZWL';
    type: 'topup' | 'deduction' | 'refund';
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    reference?: string;
    metadata?: string; // JSON string for extra details (e.g. EcoCash ref)
}

interface TransactionCreationAttributes extends Optional<TransactionAttributes, 'id' | 'status' | 'currency'> { }

class Transaction extends Model<TransactionAttributes, TransactionCreationAttributes> implements TransactionAttributes {
    declare id: string;
    declare userId: string;
    declare amount: number;
    declare currency: 'USD' | 'ZWL';
    declare type: 'topup' | 'deduction' | 'refund';
    declare status: 'pending' | 'completed' | 'failed' | 'cancelled';
    declare reference?: string;
    declare metadata?: string;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

Transaction.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        currency: {
            type: DataTypes.ENUM('USD', 'ZWL'),
            allowNull: false,
            defaultValue: 'USD',
        },
        type: {
            type: DataTypes.ENUM('topup', 'deduction', 'refund'),
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
            allowNull: false,
            defaultValue: 'pending',
        },
        reference: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        metadata: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'transactions',
    }
);

export default Transaction;
