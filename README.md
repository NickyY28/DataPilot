# DataPilot

DataPilot is a web app for exploring and working with tabular data. Upload a CSV, preview and manage datasets, run data-cleaning and analysis operations, ask questions about your data, and generate charts and insights with AI. The app also includes account authentication and an administrator dashboard.

## Features

- Register and sign in to a personal account.
- Upload CSV files and browse previously uploaded datasets.
- Clean and manipulate data, including removing duplicates, handling missing values, filtering rows, and standardizing formats.
- Ask questions about a dataset and generate insights, charts, formulas, validation rules, and data-quality information.
- Export processed data.
- Manage users and application settings from the administrator dashboard.

## Technology

- **Frontend:** React, Vite, React Router, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** MongoDB with Mongoose
- **AI:** Google Gemini API

## Prerequisites

- Node.js 20.19+ (or 22.12+) and npm
- MongoDB, either locally or through a hosted MongoDB service
- A Google Gemini API key for AI features

## Getting started

Open two terminals in the `DataPilot` project directory.

### 1. Configure the backend

Create `backend/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/digi-in-app
JWT_SECRET=replace-with-a-long-random-secret
GEMINI_API_KEY=your-gemini-api-key
PORT=5000
```

`MONGO_URI` is optional when using the default local MongoDB address shown above. Keep secrets out of source control.

Install dependencies and start the API:

```bash
cd backend
npm install
npm run dev
```

The API runs at `http://localhost:5000`. To run without the development watcher, use `npm start`.

### 2. Configure and start the frontend

In the second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). The frontend uses `http://localhost:5000` for the API by default. To use a different backend URL, create `frontend/.env` and set:

```env
VITE_API_URL=http://localhost:5000
```

`VITE_API_URL` is the backend origin; do not include the `/api` suffix.

## Administrator access

Register an account with the email `admin@example.com`, then from the `backend` directory run:

```bash
node server/scripts/create_admin.js
```

The script promotes that existing account to administrator; it does not create an account. To promote a different account, update the email in `backend/server/scripts/create_admin.js` before running it.

## API overview

The API is rooted at `/api`. Authenticated data and administrator routes require a bearer token supplied by the frontend after sign-in.

| Route | Purpose |
| --- | --- |
| `/api/auth` | Registration, login, and current-user information |
| `/api/data` | CSV upload, dataset history and retrieval, data operations, insights, charts, and downloads |
| `/api/llm` | General AI questions, intent analysis, and chat |
| `/api/admin` | Administrator statistics, user management, and settings |

`GET /` is a simple API health response. CSV uploads are limited to 100 MB by the upload middleware, with a lower configurable application limit (10 MB by default).

## Useful frontend commands

Run these from `frontend`:

```bash
npm run lint
npm run build
npm run preview
```

## Project structure

```text
DataPilot/
├── backend/
│   └── server/
│       ├── config/       # Database connection
│       ├── controllers/  # API request handlers
│       ├── middleware/   # Authentication and file uploads
│       ├── models/       # MongoDB models
│       ├── routes/       # Express routes
│       └── services/     # Data processing and AI services
└── frontend/
    └── src/
        ├── components/   # Reusable UI components
        ├── context/      # Authentication, data, and theme state
        ├── pages/        # Dashboard and account pages
        └── services/     # API clients
```
