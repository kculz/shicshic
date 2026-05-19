import { useEffect, useState } from 'react';
import type { TripSession } from '../store/useTripStore';

export type TripDemoStage = 'to_pickup' | 'to_destination' | 'arrived' | 'cancelled';

interface TripDemoState {
    driverLat: number | null;
    driverLon: number | null;
    progress: number;
    minutesLeft: number;
    secondsLeft: number;
    stage: TripDemoStage;
    phaseTitle: string;
    phaseDetail: string;
    countdownLabel: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const lerp = (start: number, end: number, progress: number) => start + (end - start) * progress;

const distanceKmBetween = (firstLat: number, firstLon: number, secondLat: number, secondLon: number) => {
    const dLat = (secondLat - firstLat) * 111;
    const avgLat = ((firstLat + secondLat) / 2) * (Math.PI / 180);
    const dLon = (secondLon - firstLon) * 111 * Math.cos(avgLat);
    return Math.sqrt(dLat * dLat + dLon * dLon);
};

const getApproachStart = (trip: TripSession) => {
    const latSpan = trip.destLat - trip.pickupLat;
    const lonSpan = trip.destLon - trip.pickupLon;
    const spanMagnitude = Math.abs(latSpan) + Math.abs(lonSpan);

    if (spanMagnitude < 0.002) {
        return {
            lat: trip.pickupLat - 0.012,
            lon: trip.pickupLon - 0.009,
        };
    }

    return {
        lat: trip.pickupLat - latSpan * 0.35,
        lon: trip.pickupLon - lonSpan * 0.35,
    };
};

const getAcceptedAt = (trip: TripSession) => {
    const timestamp = trip.acceptedAt || trip.updatedAt;
    const parsed = timestamp ? new Date(timestamp).getTime() : Date.now();
    return Number.isNaN(parsed) ? Date.now() : parsed;
};

const getTripDurations = (trip: TripSession) => {
    const pickupDurationSec = Math.max(120, (trip.estimatedArrivalMins ?? 6) * 60);
    const tripDistanceKm = distanceKmBetween(trip.pickupLat, trip.pickupLon, trip.destLat, trip.destLon);
    const destinationDurationSec = clamp(Math.round((tripDistanceKm / 28) * 3600), 300, 1800);

    return {
        pickupDurationSec,
        destinationDurationSec,
    };
};

const buildTripDemoState = (trip: TripSession): TripDemoState => {
    if (trip.status === 'cancelled') {
        return {
            driverLat: trip.pickupLat,
            driverLon: trip.pickupLon,
            progress: 0,
            minutesLeft: 0,
            secondsLeft: 0,
            stage: 'cancelled',
            phaseTitle: 'Trip cancelled',
            phaseDetail: 'This ride is no longer active.',
            countdownLabel: 'Cancelled',
        };
    }

    if (trip.status === 'completed') {
        return {
            driverLat: trip.destLat,
            driverLon: trip.destLon,
            progress: 1,
            minutesLeft: 0,
            secondsLeft: 0,
            stage: 'arrived',
            phaseTitle: 'Trip completed',
            phaseDetail: 'You have arrived at the destination.',
            countdownLabel: 'Arrived',
        };
    }

    const { pickupDurationSec, destinationDurationSec } = getTripDurations(trip);
    const acceptedAt = getAcceptedAt(trip);
    const elapsedSec = Math.max(0, Math.floor((Date.now() - acceptedAt) / 1000));
    const approachStart = getApproachStart(trip);

    if (elapsedSec < pickupDurationSec) {
        const progress = clamp(elapsedSec / pickupDurationSec, 0, 1);
        const secondsLeft = pickupDurationSec - elapsedSec;

        return {
            driverLat: lerp(approachStart.lat, trip.pickupLat, progress),
            driverLon: lerp(approachStart.lon, trip.pickupLon, progress),
            progress,
            minutesLeft: Math.max(1, Math.ceil(secondsLeft / 60)),
            secondsLeft,
            stage: 'to_pickup',
            phaseTitle: 'Driver heading to pickup',
            phaseDetail: 'The car is on the way to your pickup point now.',
            countdownLabel: `${Math.max(1, Math.ceil(secondsLeft / 60))} min to pickup`,
        };
    }

    const destinationElapsedSec = elapsedSec - pickupDurationSec;
    if (destinationElapsedSec < destinationDurationSec) {
        const progress = clamp(destinationElapsedSec / destinationDurationSec, 0, 1);
        const secondsLeft = destinationDurationSec - destinationElapsedSec;

        return {
            driverLat: lerp(trip.pickupLat, trip.destLat, progress),
            driverLon: lerp(trip.pickupLon, trip.destLon, progress),
            progress,
            minutesLeft: Math.max(1, Math.ceil(secondsLeft / 60)),
            secondsLeft,
            stage: 'to_destination',
            phaseTitle: 'Trip in progress',
            phaseDetail: 'You are moving toward the destination.',
            countdownLabel: `${Math.max(1, Math.ceil(secondsLeft / 60))} min to destination`,
        };
    }

    return {
        driverLat: trip.destLat,
        driverLon: trip.destLon,
        progress: 1,
        minutesLeft: 0,
        secondsLeft: 0,
        stage: 'arrived',
        phaseTitle: 'Arriving now',
        phaseDetail: 'The car has reached the destination.',
        countdownLabel: 'Arrived',
    };
};

export const useTripDemo = (trip: TripSession | null) => {
    const [demo, setDemo] = useState<TripDemoState | null>(() => (trip ? buildTripDemoState(trip) : null));

    useEffect(() => {
        if (!trip) {
            setDemo(null);
            return;
        }

        setDemo(buildTripDemoState(trip));
        const interval = setInterval(() => {
            setDemo(buildTripDemoState(trip));
        }, 1000);

        return () => clearInterval(interval);
    }, [trip]);

    return demo;
};
