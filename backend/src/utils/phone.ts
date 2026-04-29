
/**
 * Backend Phone Normalization Utility
 * Ensures all phone numbers are stored and queried in E.164 format.
 * Currently defaults to Zimbabwe (+263) if no country code is provided.
 */
export const normalizePhoneNumber = (phone: string): string => {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // If it starts with 0 (local format), replace with +263
    if (cleaned.startsWith('0')) {
        return `+263${cleaned.slice(1)}`;
    }

    // If it's 9 digits (local without 0), assume +263
    if (cleaned.length === 9) {
        return `+263${cleaned}`;
    }

    // If it starts with 263 but no +, add it
    if (cleaned.startsWith('263') && !phone.startsWith('+')) {
        return `+${cleaned}`;
    }

    // If it already has +, just return it cleaned (keeping +)
    if (phone.startsWith('+')) {
        return `+${cleaned}`;
    }

    return `+${cleaned}`;
};
