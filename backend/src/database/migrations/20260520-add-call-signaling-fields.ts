import { DataTypes } from 'sequelize';
import type { ModelAttributeColumnOptions } from 'sequelize';
import type { MigrationDefinition, MigrationContext } from './types.js';

const CALLS_TABLE = 'Calls';

const describeCallsTable = async ({ queryInterface }: MigrationContext) => {
    try {
        return await queryInterface.describeTable(CALLS_TABLE);
    } catch (error) {
        return null;
    }
};

const ensureColumn = async (
    context: MigrationContext,
    columnName: string,
    definition: ModelAttributeColumnOptions
) => {
    const table = await describeCallsTable(context);
    if (table?.[columnName]) {
        return;
    }

    const addColumnOptions = context.transaction
        ? { transaction: context.transaction }
        : undefined;

    await context.queryInterface.addColumn(CALLS_TABLE, columnName, definition, addColumnOptions);
};

const migration: MigrationDefinition = {
    id: '20260520-add-call-signaling-fields',
    up: async (context) => {
        const existingTable = await describeCallsTable(context);

        if (!existingTable) {
            await context.queryInterface.createTable(CALLS_TABLE, {
                id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    primaryKey: true,
                },
                tripId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                callerId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                receiverId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                callerName: {
                    type: DataTypes.STRING,
                    allowNull: true,
                },
                receiverName: {
                    type: DataTypes.STRING,
                    allowNull: true,
                },
                status: {
                    type: DataTypes.ENUM('dialing', 'active', 'ended', 'rejected', 'missed'),
                    allowNull: false,
                    defaultValue: 'dialing',
                },
                offerSdp: {
                    type: DataTypes.JSONB,
                    allowNull: true,
                },
                answerSdp: {
                    type: DataTypes.JSONB,
                    allowNull: true,
                },
                callerIceCandidates: {
                    type: DataTypes.JSONB,
                    allowNull: false,
                    defaultValue: [],
                },
                receiverIceCandidates: {
                    type: DataTypes.JSONB,
                    allowNull: false,
                    defaultValue: [],
                },
                connectedAt: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                endedAt: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                createdAt: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW,
                },
                updatedAt: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW,
                },
            }, context.transaction ? { transaction: context.transaction } : undefined);

            return;
        }

        await ensureColumn(context, 'callerName', {
            type: DataTypes.STRING,
            allowNull: true,
        });

        await ensureColumn(context, 'receiverName', {
            type: DataTypes.STRING,
            allowNull: true,
        });

        await ensureColumn(context, 'offerSdp', {
            type: DataTypes.JSONB,
            allowNull: true,
        });

        await ensureColumn(context, 'answerSdp', {
            type: DataTypes.JSONB,
            allowNull: true,
        });

        await ensureColumn(context, 'callerIceCandidates', {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: [],
        });

        await ensureColumn(context, 'receiverIceCandidates', {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: [],
        });

        await ensureColumn(context, 'connectedAt', {
            type: DataTypes.DATE,
            allowNull: true,
        });

        await ensureColumn(context, 'endedAt', {
            type: DataTypes.DATE,
            allowNull: true,
        });
    },
    down: async (context) => {
        const existingTable = await describeCallsTable(context);
        if (!existingTable) {
            return;
        }

        const removableColumns = [
            'callerName',
            'receiverName',
            'offerSdp',
            'answerSdp',
            'callerIceCandidates',
            'receiverIceCandidates',
            'connectedAt',
            'endedAt',
        ];

        for (const columnName of removableColumns) {
            const latestTable = await describeCallsTable(context);
            if (latestTable?.[columnName]) {
                await context.queryInterface.removeColumn(CALLS_TABLE, columnName, {
                    ...(context.transaction ? { transaction: context.transaction } : {}),
                });
            }
        }
    },
};

export default migration;
