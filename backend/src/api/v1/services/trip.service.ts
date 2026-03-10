import Trip from '../../../database/models/Trip.js';

export const createTrip = async (data: { passengerId: string; pickupLocation: string; destinationLocation: string; isShared?: boolean }) => {
    return await Trip.create({
        ...data,
        status: 'requested'
    });
};

export const getTripById = async (id: string) => {
    const trip = await Trip.findByPk(id);
    if (!trip) throw new Error('Trip not found');
    return trip;
};

export const updateTripStatus = async (id: string, status: Trip['status']) => {
    const trip = await getTripById(id);
    return await trip.update({ status });
};

export const getAvailableTrips = async () => {
    return await Trip.findAll({ where: { status: 'requested' } });
};
