import type { Request, Response } from 'express';
import Incident from '../../../database/models/Incident.js';
import User from '../../../database/models/User.js';
import Trip from '../../../database/models/Trip.js';
import Profile from '../../../database/models/Profile.js';

export const reportIncident = async (req: Request, res: Response) => {
    try {
        const { tripId, reporterId, type, description, locationLat, locationLon } = req.body;

        const incident = await Incident.create({
            tripId,
            reporterId,
            type,
            description,
            locationLat,
            locationLon
        });

        res.status(201).json({ message: 'Incident reported successfully', incident });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getIncidents = async (req: Request, res: Response) => {
    try {
        const incidents = await Incident.findAll({
            include: [
                { model: User, as: 'reporter', attributes: ['id', 'phoneNumber', 'role'] },
                { 
                    model: Trip, 
                    as: 'trip',
                    include: [
                        { model: User, as: 'passenger', attributes: ['id', 'phoneNumber'] },
                        { model: User, as: 'driver', attributes: ['id', 'phoneNumber'] }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(incidents);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getIncidentReport = async (req: Request, res: Response) => {
    try {
        const id = req.params['id'] as string;
        const incident = await Incident.findByPk(id, {
            include: [
                { 
                    model: User, as: 'reporter', 
                    include: [{ model: Profile }] 
                },
                { 
                    model: Trip, 
                    as: 'trip',
                    include: [
                        { model: User, as: 'passenger', include: [{ model: Profile }] },
                        { model: User, as: 'driver', include: [{ model: Profile }] }
                    ]
                }
            ]
        });

        if (!incident) {
            res.status(404).json({ error: 'Incident not found' });
            return;
        }

        // Generate a text-based report for authorities
        const trip = incident.get('trip') as any;
        const reporter = incident.get('reporter') as any;
        const passenger = trip?.passenger;
        const driver = trip?.driver;

        const report = `
SHICSHIC INCIDENT REPORT
------------------------
Incident ID: ${incident.id}
Date: ${incident.createdAt}
Type: ${incident.type.toUpperCase()}
Status: ${incident.status.toUpperCase()}

REPORTER DETAILS:
Name: ${reporter?.Profile?.fullName || 'N/A'}
Phone: ${reporter?.phoneNumber || 'N/A'}
Role: ${reporter?.role}

TRIP DETAILS:
Trip ID: ${incident.tripId || 'N/A'}
Pickup: ${trip?.pickupLocation || 'N/A'}
Destination: ${trip?.destinationLocation || 'N/A'}

PASSENGER DETAILS:
Name: ${passenger?.Profile?.fullName || 'N/A'}
Phone: ${passenger?.phoneNumber || 'N/A'}

DRIVER DETAILS:
Name: ${driver?.Profile?.fullName || 'N/A'}
Phone: ${driver?.phoneNumber || 'N/A'}
Vehicle: ${driver?.Profile?.vehicleMake || 'N/A'} ${driver?.Profile?.vehicleModel || ''} (${driver?.Profile?.vehiclePlate || 'N/A'})

INCIDENT DESCRIPTION:
${incident.description}

LOCATION:
Lat: ${incident.locationLat || 'N/A'}
Lon: ${incident.locationLon || 'N/A'}

EMERGENCY CONTACTS (ZIMBABWE):
Police: 999 or 0242-703631 (Central)
Ambulance: 994 or 0242-771221 (MARS) / 0242-756600 (ACE)
Fire: 993
------------------------
END OF REPORT
        `;

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=incident_${incident.id}.txt`);
        res.send(report);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
