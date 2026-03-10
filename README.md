# ShicShic - Ride Sharing Application

ShicShic is a modern ride-sharing platform designed for seamless travel experiences. It features real-time bidding between passengers and drivers, integrated chat, and high-quality in-app calling.

## Features

- **Real-time Bidding**: Passengers offer fares and drivers bid nearby.
- **Interactive Mapping**: Powered by Leaflet for precise location and navigation.
- **In-App Communication**: Integrated chat and premium VOIP calling.
- **Smooth Animations**: High-performance animations using `react-native-reanimated`.
- **Premium UI**: Sleek, modern design with an focus on user experience.

## Tech Stack

### Mobile (Frontend)
- **Framework**: Expo / React Native
- **Navigation**: Expo Router
- **Animations**: React Native Reanimated
- **Icons**: Expo Vector Icons (MaterialCommunityIcons)
- **Maps**: Leaflet.js via WebView

### Backend
- **Framework**: Express.js with TypeScript
- **ORM**: Sequelize (PostgreSQL)
- **Validation**: Joi / express-validator
- **Real-time**: Socket.io (planned/partial)

## Project Structure

- `mobile/`: Expo React Native application.
- `backend/`: Express.js server with TypeScript.
- `web/`: Web application (in progress).

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm / yarn
- Expo Go (for mobile testing)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/kculz/shicshic.git
   cd shicshic
   ```

2. **Setup Backend**:
   ```bash
   cd backend
   npm install
   # Configure .env file
   npm run dev
   ```

3. **Setup Mobile**:
   ```bash
   cd mobile
   npm install
   npx expo start
   ```

## License
MIT
