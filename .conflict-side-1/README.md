# CM-web

A modern React application built with TypeScript, Vite, and Storybook.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm (comes with Node.js)

## Getting Started

1. Clone the repository:
```bash
git clone [repository-url]
cd CM-web
```

2. Install dependencies:
```bash
npm install
```

## Available Scripts

### Development Server
To start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:5173` (or the next available port).

### Storybook
To run Storybook (component development environment):
```bash
npm run storybook
```
Storybook will start on port 6006 (or 6008 if 6006 is occupied). Access it at:
- Local: http://localhost:6006 (or http://localhost:6008)
- Network: http://[your-ip]:6006 (or port 6008)

### Other Commands
- `npm run build` - Build the production version
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint for code quality checks

## Known Issues

- There is a compatibility warning with `@storybook/addon-styling@2.0.0` and Storybook 8.6.4. This doesn't affect functionality but will be resolved in future updates.

## Tech Stack

- React 18
- TypeScript
- Vite
- Storybook 8
- Radix UI Components
- TailwindCSS
- And more (see package.json for full list)