import sequelize from '../../config/database.js';
import { migrations } from './index.js';

const MIGRATIONS_TABLE = 'schema_migrations';

type MigrationRow = {
    id: string;
    applied_at: Date;
};

const ensureMigrationsTable = async () => {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
            id VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);
};

const getAppliedMigrationIds = async () => {
    await ensureMigrationsTable();

    const [rows] = await sequelize.query(`SELECT id, applied_at FROM ${MIGRATIONS_TABLE} ORDER BY applied_at ASC;`);
    const parsedRows = rows as MigrationRow[];
    return new Set(parsedRows.map((row) => row.id));
};

export const runMigrations = async () => {
    await ensureMigrationsTable();
    const appliedMigrationIds = await getAppliedMigrationIds();
    const context = {
        queryInterface: sequelize.getQueryInterface(),
        sequelize,
    };

    for (const migration of migrations) {
        if (appliedMigrationIds.has(migration.id)) {
            continue;
        }

        console.log(`[migrations] Running ${migration.id}`);

        await sequelize.transaction(async (transaction) => {
            await migration.up({ ...context, transaction });
            await sequelize.query(
                `INSERT INTO ${MIGRATIONS_TABLE} (id) VALUES (:id);`,
                { replacements: { id: migration.id }, transaction }
            );
        });

        console.log(`[migrations] Applied ${migration.id}`);
    }
};

export const getMigrationStatus = async () => {
    const appliedMigrationIds = await getAppliedMigrationIds();

    return migrations.map((migration) => ({
        id: migration.id,
        applied: appliedMigrationIds.has(migration.id),
    }));
};

export const rollbackLastMigration = async () => {
    await ensureMigrationsTable();

    const [rows] = await sequelize.query(`
        SELECT id
        FROM ${MIGRATIONS_TABLE}
        ORDER BY applied_at DESC
        LIMIT 1;
    `);

    const latestMigration = (rows as Array<{ id: string }>)[0];
    if (!latestMigration) {
        console.log('[migrations] No applied migrations to roll back.');
        return;
    }

    const migration = migrations.find((item) => item.id === latestMigration.id);
    if (!migration) {
        throw new Error(`Migration ${latestMigration.id} is recorded but not available locally.`);
    }

    const context = {
        queryInterface: sequelize.getQueryInterface(),
        sequelize,
    };

    console.log(`[migrations] Rolling back ${migration.id}`);

    await sequelize.transaction(async (transaction) => {
        await migration.down({ ...context, transaction });
        await sequelize.query(
            `DELETE FROM ${MIGRATIONS_TABLE} WHERE id = :id;`,
            { replacements: { id: migration.id }, transaction }
        );
    });

    console.log(`[migrations] Rolled back ${migration.id}`);
};
