import type { MigrationDefinition } from './types.js';
import addCallSignalingFields from './20260520-add-call-signaling-fields.js';

export const migrations: MigrationDefinition[] = [
    addCallSignalingFields,
];
