import { DataTypes, Model } from 'sequelize';
import type { Optional } from 'sequelize';
import sequelize from '../../config/database.js';

interface UserAttributes {
    id: string;
    phoneNumber: string;
    role: 'passenger' | 'driver' | 'admin' | 'support';
    isVerified: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'isVerified'> { }

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    public id!: string;
    public phoneNumber!: string;
    public role!: 'passenger' | 'driver' | 'admin' | 'support';
    public isVerified!: boolean;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

User.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        phoneNumber: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        role: {
            type: DataTypes.ENUM('passenger', 'driver', 'admin', 'support'),
            allowNull: false,
            defaultValue: 'passenger',
        },
        isVerified: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        sequelize,
        tableName: 'users',
    }
);

export default User;
