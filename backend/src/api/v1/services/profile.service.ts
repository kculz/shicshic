import Profile from '../../../database/models/Profile.js';

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

    // Protect certain fields or add logic here
    const { fullName, vehicleMake, vehicleModel, vehiclePlate, vehicleColor } = data;
    
    return await profile.update({
        fullName,
        vehicleMake,
        vehicleModel,
        vehiclePlate,
        vehicleColor
    });
};
