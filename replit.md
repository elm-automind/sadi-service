# Secure Delivery Registration System

## Overview

This is a full-stack web application for managing delivery registrations and addresses. Users can register their profiles, add detailed delivery addresses with location data and photos, set delivery preferences, and manage fallback contacts. The system generates unique digital IDs for each address and provides QR codes for easy sharing with delivery services.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript
- Vite as the build tool and development server
- Wouter for client-side routing
- TanStack Query (React Query) for server state management
- shadcn/ui components built on Radix UI primitives
- Tailwind CSS v4 for styling with custom design tokens

**UI Component System:**
The application uses a comprehensive shadcn/ui component library with the "new-york" style variant. Components are built on Radix UI primitives providing accessible, composable UI elements. The design system uses CSS custom properties for theming with support for light/dark modes.

**Form Management:**
React Hook Form with Zod schema validation handles all form inputs. The `@hookform/resolvers` package integrates Zod schemas for type-safe validation.

**State Management:**
- TanStack Query manages server state with configured defaults (no refetch on window focus, infinite stale time)
- Session-based authentication with cookies
- Local component state for UI interactions

**Key Features:**
- Interactive maps using Leaflet with react-leaflet for location selection
- Voice input capability using Web Speech API for accessibility
- File upload with drag-and-drop using react-dropzone
- QR code generation using react-qr-code for address sharing
- Responsive design optimized for mobile and desktop
- Internationalization (i18n) with support for English and Arabic languages
- RTL (Right-to-Left) layout support for Arabic

**Internationalization (i18n):**
- react-i18next for translation management
- i18next-browser-languagedetector for automatic language detection
- Translation files located in `client/src/lib/locales/` (en.json, ar.json)
- Language switcher component in the header for manual language selection
- RTL CSS support in index.css with automatic document direction updates
- Language preference persisted to localStorage

### Backend Architecture

**Technology Stack:**
- Node.js with Express.js
- TypeScript with ESM modules
- Session-based authentication using express-session with MemoryStore
- PostgreSQL database via Drizzle ORM

**API Design:**
RESTful API endpoints following resource-based routing:
- `/api/register` - User registration with optional address
- `/api/login` - Session-based authentication
- `/api/logout` - Session termination
- `/api/user` - Fetch authenticated user with addresses
- `/api/address/:digitalId` - Public address lookup by digital ID
- Address management endpoints (create, update)
- Fallback contact endpoints

**Authentication Strategy:**
Session-based authentication using express-session with in-memory store (MemoryStore). Sessions persist for 24 hours with secure cookies in production. The system uses a helper middleware `requireAuth` to protect authenticated routes.

**Build Process:**
Custom build script using esbuild for server bundling and Vite for client bundling. The build process bundles frequently-used dependencies to reduce syscalls and improve cold start times. Allowlisted dependencies are bundled while others remain external.

### Data Storage

**Database:**
PostgreSQL database managed through Drizzle ORM with type-safe schema definitions.

**Schema Design:**

**Users Table:**
- Stores user authentication and profile data
- Unique constraints on iqamaId (national ID), email, and phone
- Password stored as plain text (security concern - should use hashing)

**Addresses Table:**
- Linked to users via foreign key
- Contains unique digitalId for public access
- Stores geolocation data (lat/lng)
- Supports photo uploads (building, gate, door)
- Includes delivery preferences (time slots, special notes)
- Supports fallback options (door, neighbor, security)

**Fallback Contacts Table:**
- Linked to addresses via foreign key
- Alternative delivery recipients with their own location data
- Supports relationship tracking and photo documentation

**Validation:**
Zod schemas generated from Drizzle tables using drizzle-zod for consistent validation between frontend and backend.

### File Structure

```
/client - Frontend React application
  /src
    /components - Reusable UI components
    /pages - Route-based page components
    /lib - Utilities and query client setup
    /hooks - Custom React hooks
/server - Backend Express application
  index.ts - Server entry point with middleware setup
  routes.ts - API route definitions
  storage.ts - Database access layer
  db.ts - Database connection and Drizzle setup
/shared - Shared code between client and server
  schema.ts - Drizzle schema and Zod validators
```

## External Dependencies

### Third-Party Services

**Mapping Services:**
- Leaflet for interactive maps
- OpenStreetMap tiles (via tile server)
- Nominatim API for reverse geocoding (converting coordinates to addresses)

**UI Component Libraries:**
- Radix UI for accessible component primitives
- Lucide React for icons
- shadcn/ui component patterns

### Database

**PostgreSQL:**
- Provisioned via environment variable `DATABASE_URL`
- Managed through Drizzle ORM
- Connection pooling via node-postgres (pg)

### Development Tools

**Replit-specific Integrations:**
- `@replit/vite-plugin-runtime-error-modal` - Development error overlay
- `@replit/vite-plugin-cartographer` - Code navigation
- `@replit/vite-plugin-dev-banner` - Development indicator
- Custom meta images plugin for OpenGraph image URL generation

### Build Dependencies

**Core Build Tools:**
- Vite for frontend bundling
- esbuild for server bundling
- TypeScript compiler for type checking
- Tailwind CSS for styling

**Key Runtime Dependencies:**
- Express.js web framework
- Drizzle ORM for database access
- React and React DOM
- date-fns for date manipulation
- nanoid for unique ID generation