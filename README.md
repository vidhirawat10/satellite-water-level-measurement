# 🌊 Dam Water Level Analyzer using Satellite Imagery

This project is a full-stack web application that leverages Google Earth Engine to analyze satellite imagery and estimate the water level of dams and reservoirs worldwide. Users can search for a dam by name and receive a detailed analysis, including an interactive map, satellite overlay, and key metrics.

---

## ✨ Key Features

* **Interactive Map View**: Displays search results on a map powered by React Leaflet.
* **On-Demand Satellite Analysis**: Fetches and processes recent Sentinel-2 satellite imagery via Google Earth Engine.
* **Water Body Detection**: Automatically identifies and draws the polygon of the water body.
* **Water Level Estimation**: Implements an advanced algorithm to estimate the water's surface elevation (height) based on its surface area and a Digital Elevation Model (DEM).
* **Analysis Panel**: Shows key metrics like minimum, mean, and maximum water surface elevation.
* **Search History**: Tracks and displays recent user searches via a Supabase backend.

---

## 🛠️ Technology Stack

This project is built with a modern MERN-like stack, integrating powerful geospatial and database services.

* **Frontend**: React.js, React Leaflet, Axios
* **Backend**: Node.js, Express.js
* **Geospatial Engine**: Google Earth Engine (GEE)
* **Geocoding**: Mapbox API
* **Database**: Supabase (PostgreSQL)
* **Deployment**: Vercel (Frontend), Heroku/Render (Backend)

---

## 🚀 Getting Started

To get a local copy up and running, follow these steps.

### Prerequisites

* Node.js and npm installed
* A Google Cloud Project with a Service Account enabled for Google Earth Engine. You will need the `private-key.json`.
* API keys for Mapbox and Supabase.

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/your-username/dam-analyzer.git](https://github.com/your-username/dam-analyzer.git)
    cd dam-analyzer
    ```

2.  **Setup the Backend (`/server`):**
    * Navigate to the server directory: `cd server`
    * Install NPM packages: `npm install`
    * Create a `.env` file in the `/server` directory and add your keys:
        ```env
        PORT=5000
        MAPBOX_API_KEY="your_mapbox_api_key"
        SUPABASE_URL="your_supabase_url"
        SUPABASE_ANON_KEY="your_supabase_anon_key"
        ```
    * Place your Google Earth Engine `private-key.json` file inside the `/server` directory.
    * Start the server: `npm start`

3.  **Setup the Frontend (`/client`):**
    * Navigate to the client directory from the root: `cd client`
    * Install NPM packages: `npm install`
    * Create a `.env` file in the `/client` directory and add your backend API URL:
        ```env
        REACT_APP_API_URL="http://localhost:5000"
        ```
    * Start the React app: `npm start`

Your application should now be running, with the frontend on `http://localhost:3000` and the backend on `http://localhost:5000`.

---

## 🔬 Core Methodology

The application's core logic relies on two key algorithms:

1.  **Water Body Extraction**: Uses the Normalized Difference Water Index (NDWI) on Sentinel-2 imagery to create a binary water mask, which is then converted into a vector polygon.
2.  **Area-to-Height Estimation**: Implements a binary search algorithm against a Digital Elevation Model (DEM). It iteratively finds the water elevation (height) that corresponds to the surface area of the extracted polygon.
