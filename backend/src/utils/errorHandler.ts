
import { ValidationError, UniqueConstraintError } from 'sequelize';

export const formatSequelizeError = (error: any): string => {
    if (error instanceof UniqueConstraintError) {
        const fields = error.errors.map(e => e.path).join(', ');
        return `Already exists: ${fields}`;
    }
    
    if (error instanceof ValidationError) {
        return error.errors.map(e => e.message).join(', ');
    }

    return error.message || 'An unexpected error occurred';
};
