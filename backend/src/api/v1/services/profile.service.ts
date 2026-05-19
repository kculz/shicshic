import Profile, { type SavedPlace } from '../../../database/models/Profile.js';

const PROFILE_FIELDS = [
    'fullName',
    'vehicleMake',
    'vehicleModel',
    'vehiclePlate',
    'vehicleColor',
    'searchRadius',
    'homeAddress',
    'homeLat',
    'homeLon',
    'workAddress',
    'workLat',
    'workLon',
    'savedPlaces',
] as const;

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const normalizeSavedPlaces = (value: unknown): SavedPlace[] => {
    if (!Array.isArray(value)) {
        throw new Error('Saved places must be an array.');
    }

    return value.map((item, index) => {
        if (!item || typeof item !== 'object') {
            throw new Error(`Saved place ${index + 1} is invalid.`);
        }

        const place = item as Record<string, unknown>;
        const label = String(place['label'] ?? '').trim();
        const address = String(place['address'] ?? '').trim();
        const lat = Number(place['lat']);
        const lon = Number(place['lon']);
        const id = String(place['id'] ?? '').trim();

        if (!id || !label || !address || !Number.isFinite(lat) || !Number.isFinite(lon)) {
            throw new Error(`Saved place ${index + 1} is incomplete.`);
        }

        return { id, label, address, lat, lon };
    });
};

export const createProfile = async (userId: string, fullName: string) => {
    return await Profile.create({ userId, fullName, kycStatus: 'pending' });
};

export const getProfileByUserId = async (userId: string) => {
    const profile = await Profile.findOne({ where: { userId } });
    if (!profile) throw new Error('Profile not found');
    return profile;
};

export const updateProfileKYC = async (userId: string, data: { idCardFrontUrl?: string; idCardBackUrl?: string; selfieUrl?: string }) => {
    const profile = await Profile.findOne({ where: { userId } });
    if (!profile) throw new Error('Profile not found');

    return await profile.update({
        ...data,
        kycStatus: 'pending' // Re-set to pending on update
    });
};

export const getProfilesByStatus = async (status: 'pending' | 'approved' | 'rejected') => {
    return await Profile.findAll({ where: { kycStatus: status } });
};

export const updateProfileData = async (userId: string, data: any) => {
    const profile = await Profile.findOne({ where: { userId } });
    if (!profile) throw new Error('Profile not found');

    const updates: Record<string, unknown> = {};

    for (const field of PROFILE_FIELDS) {
        if (!hasOwn(data, field)) continue;

        if (field === 'savedPlaces') {
            updates[field] = normalizeSavedPlaces(data[field]);
            continue;
        }

        if (field === 'searchRadius') {
            const radius = Number(data[field]);
            if (!Number.isFinite(radius) || radius <= 0) {
                throw new Error('Search radius must be a positive number.');
            }

            updates[field] = Math.round(radius);
            continue;
        }

        updates[field] = data[field];
    }

    return await profile.update(updates);
};
