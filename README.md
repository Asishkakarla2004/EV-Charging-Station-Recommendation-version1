# EV Smart Charging Platform

A full-stack web application for EV charging station booking with user, station owner, and admin panels.

## Features

- User authentication with JWT and OTP email verification
- Interactive map for station recommendations
- Booking system with normal and emergency options
- Role-based dashboards
- Dark/Light mode toggle
- Black & White theme

## Tech Stack

- Frontend: React.js + Tailwind CSS
- Backend: Node.js + Express.js
- Database: MongoDB (users) + PostgreSQL (stations/bookings)
- Maps: Google Maps API
- Auth: JWT + Nodemailer

## Setup Instructions

### Prerequisites

- Node.js
- MongoDB
- PostgreSQL
- Google Maps API Key

### Backend Setup

1. Navigate to backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```
3. Set up databases:
   - Start MongoDB
   - Start PostgreSQL and create database 'evcharging'
   - Run the init script:
     ```
     psql -d evcharging -f database/init.sql
     ```
4. Configure environment variables in `.env`:
   - Update MONGO_URI, PG_*, EMAIL_*, JWT_SECRET, GOOGLE_MAPS_API_KEY
5. Seed data:
   ```
   node database/seed.js
   ```
6. Start server:
   ```
   npm run dev
   ```
### Frontend Setup

1. Navigate to frontend directory:
   ```
   cd frontend
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Start development server:
   ```
   npm run dev
   ```
## API Endpoints

- POST /api/auth/register - Register user
- POST /api/auth/login - Login
- GET /api/stations - Get all stations
- POST /api/bookings - Create booking
- etc.

## Notes

- Ensure all environment variables are set
- For production, configure proper CORS and security
- Maps integration requires Google Maps API key
