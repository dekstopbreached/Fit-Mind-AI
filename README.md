# FitMind AI

FitMind AI is a habit tracker and productivity assistant built with React, Vite, Express, MongoDB, and Gemini/OpenAI AI integration.

The app includes:
- A React frontend for dashboards, habit management, insights, and AI chat
- An Express backend with JWT auth and MongoDB data storage
- AI support for habit suggestions and chat via Gemini or OpenAI

## Features

- User registration and login
- Habit creation and tracking
- Daily/weekly habit logs and streaks
- AI-powered habit suggestions and weekly summaries
- Local token storage with protected routes

## Repository structure

- `src/` - frontend React application
- `backend/` - Express API server
- `backend/models/` - Mongoose schemas
- `backend/routes/` - API routes for auth, habits, logs, and AI
- `src/context/` - auth and theme providers
- `src/pages/` - application pages like `Login`, `Register`, `Dashboard`, and `Insights`

## Setup

1. Clone the repository:

```bash
git clone https://github.com/dekstopbreached/Fit-Mind-AI-Mern-Stack-Project.git
cd ai-habit-tracker-ui-boilerplate-code-main
```

2. Install frontend dependencies:

```bash
npm install
```

3. Install backend dependencies:

```bash
npm run backend:install
```

4. Configure backend environment variables:

```bash
cp backend/.env.example backend/.env
```

Update `backend/.env` with your values:
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - secret key for JWT token signing
- `AI_PROVIDER` - `gemini` or `openai`
- `GEMINI_API_KEY` or `OPENAI_API_KEY`
- `PORT` - backend server port (default `8000`)

## Running the app

Start the backend first:

```bash
npm run backend:dev
```

Then start the frontend from the project root:

```bash
npm run dev
```

Open your browser at the Vite URL shown in the terminal (default `http://localhost:5173`).

## Notes

- If login fails, ensure the backend is running on `http://localhost:8000` and `backend/.env` contains a valid `JWT_SECRET`.
- The frontend uses `src/api/axios.js` with a default base URL of `http://localhost:8000/api`.
- Start backend first, then frontend, to avoid authentication request errors.

## Development

To build the frontend:

```bash
npm run build
```

To run ESLint across the project:

```bash
npm run lint
```
