# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

Kinovo is a React Native mobile events application with a Node.js backend. The project follows a monorepo structure:

- `client/` - React Native mobile app using Expo Router
- `server/` - Node.js Express backend with MongoDB

## Common Commands

### Client (React Native/Expo)
```bash
cd client
npm start              # Start Expo development server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run web            # Run web version
```

### Server (Node.js)
```bash
cd server
npm start              # Start production server
npm run dev            # Start development server with nodemon
```

## Code Architecture

### Client Architecture
- **Framework**: React Native with Expo Router for navigation
- **State Management**: Redux Toolkit with React Redux
- **UI Components**: Custom components with Expo UI and React Native Elements
- **Authentication**: Firebase Auth with Apple, Google, Facebook OAuth
- **Real-time**: Firebase Realtime Database
- **Push Notifications**: Firebase Cloud Messaging with Expo Notifications
- **Maps**: React Native Maps for location features
- **Navigation**: File-based routing with Expo Router in `app/` directory

### Server Architecture
- **Framework**: Express.js with MongoDB (Mongoose)
- **Authentication**: JWT tokens, Firebase Admin SDK
- **Real-time**: Firebase Realtime Database change streams
- **External APIs**: Google OAuth, Apple Auth, OpenAI, Apple WeatherKit
- **Notifications**: Firebase Cloud Messaging
- **Storage**: AWS S3 for file uploads
- **Deployment**: Docker containers with nginx proxy

### Key Client Directories
- `app/` - File-based routing pages (Expo Router)
- `components/` - Reusable UI components
- `context/` - React Context providers
- `hooks/` - Custom React hooks
- `utils/` - Utility functions and API client
- `constants/` - App constants (colors, activities, cities)

### Key Server Directories
- `controllers/` - Express route handlers
- `routes/` - API route definitions
- `database/schemas/` - Mongoose schemas
- `services/` - Business logic services
- `utils/` - Utility functions and middleware
- `cron/` - Scheduled tasks
- `aws/` - AWS Lambda functions

## Development Guidelines

### From .cursor/rules/project_rules.mdc:
- Reuse existing libraries and utilities within the codebase
- Keep modules around 200 lines - split larger modules
- Implement proper cleanup in useEffect hooks
- Prevent infinite loops and unnecessary rerenders  
- Follow existing coding style and hierarchy
- Avoid unnecessary changes to existing functionality

### Code Organization
- Components are organized by feature/screen
- Shared components in `components/` directory
- Custom hooks follow `use` prefix convention
- Context providers handle global state
- API calls centralized in `utils/api.ts`

### Authentication Flow
- Firebase Auth handles user authentication
- JWT tokens for API authorization
- OAuth providers: Apple, Google, Facebook
- Two-factor authentication support

### Database Schema
- Users, Events, Notifications, Friends, Categories
- MongoDB with Mongoose ODM
- Firebase Realtime Database for real-time features
- Event occurrence tracking for recurring events

### Push Notifications
- Firebase Cloud Messaging for cross-platform notifications
- Event reminders scheduled via AWS EventBridge
- User notification preferences stored in database

## Testing and Deployment

The project uses Firebase services for authentication, real-time database, and push notifications. Server deployment uses Docker containers with nginx proxy configuration.

## Key Features

- Event creation and management with recurring events
- Friend management and social features
- Location-based event discovery
- Push notifications and reminders
- Calendar integration
- Weather integration for events
- AI assistant for event suggestions
- Real-time updates and notifications

## 🚫 Git & GitHub Restrictions (DO NOT TOUCH)

- Claude Code **must never** interact with or modify any Git/GitHub-related files or commands.

## Types (DO NOT TOUCH)

- DO NOT USE ANY TYPES. EVERYTHING SHOULD HAVE PROPER TYPES!