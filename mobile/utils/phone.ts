
/**
 * Utility for phone number formatting and validation.
 * Designed to be extensible for international expansion.
 */

export interface CountryConfig {
    code: string;
    prefix: string;
    format: RegExp;
    mask: string;
}

export const COUNTRIES: Record<string, CountryConfig> = {
    ZW: {
        code: 'ZW',
        prefix: '+263',
        format: /^(\+263|0)7[1-8][0-9]{7}$/,
        mask: '+263 7XX XXX XXX',
    },
    // Add more countries here as the app expands
};

/**
 * Normalizes a phone number to E.164 format.
 * Example: 0771234567 -> +263771234567
 */
export const normalizePhoneNumber = (phone: string, countryCode: string = 'ZW'): string => {
    const config = COUNTRIES[countryCode];
    if (!config) return phone;

    let cleanPhone = phone.replace(/\s+/g, '');

    if (cleanPhone.startsWith('0')) {
        return config.prefix + cleanPhone.substring(1);
    }

    if (!cleanPhone.startsWith('+')) {
        return config.prefix + cleanPhone;
    }

    return cleanPhone;
};

/**
 * Formats a phone number for display.
 * Example: +263771234567 -> +263 771 234 567
 */
export const formatPhoneDisplay = (phone: string, countryCode: string = 'ZW'): string => {
    const normalized = normalizePhoneNumber(phone, countryCode);
    
    if (countryCode === 'ZW' && normalized.startsWith('+263')) {
        const parts = [
            normalized.substring(0, 4), // +263
            normalized.substring(4, 7), // 771
            normalized.substring(7, 10), // 234
            normalized.substring(10),    // 567
        ];
        return parts.join(' ');
    }

    return normalized;
};

/**
 * Masks a phone number for privacy.
 * Example: +263771234567 -> ••••••••4567
 */
export const maskPhoneNumber = (phone: string): string => {
    if (!phone) return '•••• ••• ••••';
    return phone.slice(0, -4).replace(/./g, '•') + phone.slice(-4);
};

/**
 * Validates a phone number based on country configuration.
 */
export const isValidPhone = (phone: string, countryCode: string = 'ZW'): boolean => {
    const config = COUNTRIES[countryCode];
    if (!config) return false;

    const cleanPhone = phone.replace(/\s+/g, '');
    return config.format.test(cleanPhone);
};
