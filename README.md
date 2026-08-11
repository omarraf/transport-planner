# 🌱 Sustainable Transport Planner

A modern web application that helps users plan eco-friendly routes and compare different transportation methods with real-time emissions, cost calculations, and environmental impact analysis.

## ✨ Features

### 🗺️ Route Planning
- **Multi-modal routing** - Compare walking, cycling, and driving routes
- **Interactive map** - Powered by Mapbox GL JS with custom markers and route visualization
- **Real-time directions** - Get accurate route calculations with turn-by-turn guidance
- **Smart location search** - Intelligent geocoding with autocomplete dropdown and multiple location suggestions

### 📊 Environmental Analytics
- **Carbon emissions tracking** - Calculate CO2 footprint for each transport mode
- **Cost analysis** - Estimate travel costs including fuel, maintenance, and depreciation
- **Health metrics** - Track calories burned for active transport modes

### 🔗 External Integration
- **Google Maps links** - One-click access to detailed navigation in Google Maps
- **Route comparison** - Side-by-side analysis of all transport options
- **Performance metrics** - Distance, duration, and efficiency comparisons

## 🛠️ Tech Stack

### Frontend
- **[Next.js 14](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)** - Interactive maps and route visualization

### Backend
- **[Node.js](https://nodejs.org/)** - JavaScript runtime
- **[Express.js](https://expressjs.com/)** - Web application framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe server development
- **[Mapbox Directions API](https://docs.mapbox.com/api/navigation/directions/)** - Route calculations

### Infrastructure & DevOps
- **[Vercel](https://vercel.com/)** - Frontend deployment and hosting
- **[Railway](https://railway.app/)** - Backend API deployment
- **[Docker](https://www.docker.com/)** - Containerized backend deployment
- **GitHub Actions** - CI/CD


## Usage

1. **Enter locations** - Type start and destination addresses to see autocomplete suggestions
2. **Select locations** - Choose from multiple location options in the dropdown
3. **Calculate routes** - Click "Calculate All Routes" to compare options
4. **View results** - See distance, time, emissions, and costs for each mode
5. **Explore map** - Interactive route visualization with custom controls
6. **Open in Google Maps** - Click any transport method for more detailed navigation

## 🧪 Testing

Testing is currently in progress. The project is rolling out a test suite to ensure reliability across the backend services and API routes.

### Backend
- **Framework:** [Jest](https://jestjs.io/) is configured as the test runner for the Node.js/Express backend.
- **Status:** In progress — unit and integration tests are being written for the routing, geocoding, emissions, and caching services.
- **Run tests:**
  ```bash
  npm --prefix backend test
  ```

### Frontend
- **Status:** In progress — component and integration test coverage is being planned and added.

> Note: The test suite is under active development, so coverage may be limited until the rollout is complete.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.