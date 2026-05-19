import dotenv from 'dotenv';
import sequelize from '../config/database.js';
import { getMigrationStatus, rollbackLastMigration, runMigrations } from './migrations/runner.js';

dotenv.config();

const command = process.argv[2] ?? 'up';

const main = async () => {
    await sequelize.authenticate();

    if (command === 'up') {
        await runMigrations();
        return;
    }

    if (command === 'status') {
        const status = await getMigrationStatus();
        status.forEach((item) => {
            console.log(`${item.applied ? 'applied' : 'pending'} ${item.id}`);
        });
        return;
    }

    if (command === 'down') {
        await rollbackLastMigration();
        return;
    }

    throw new Error(`Unsupported migration command: ${command}`);
};

main()
    .catch((error) => {
        console.error('[migrations] Command failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await sequelize.close();
    });
