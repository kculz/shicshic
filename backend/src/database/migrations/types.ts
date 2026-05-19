import type { QueryInterface, Sequelize, Transaction } from 'sequelize';

export interface MigrationContext {
    queryInterface: QueryInterface;
    sequelize: Sequelize;
    transaction?: Transaction;
}

export interface MigrationDefinition {
    id: string;
    up: (context: MigrationContext) => Promise<void>;
    down: (context: MigrationContext) => Promise<void>;
}
