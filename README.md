# TaskFlow – Personal Task & Productivity Manager

TaskFlow is a full-stack personal productivity web application for creating, organizing, tracking, and analyzing tasks. It uses a React frontend, an Express API, and a persistent SQLite database managed with Prisma.

## What Was Built

- A professional, responsive productivity dashboard with light and dark themes
- Complete task management (create, edit, delete, complete/reopen, status and progress updates)
- Intelligent dynamic deadline states (No Deadline, Upcoming, Due Soon, Due Today, Overdue, Completed)
- Search, filtering, and sorting for tasks
- Today, Upcoming, Completed, and All Tasks views
- Permanent activity history with task title snapshots preserved even when tasks are deleted
- Category management with default and custom categories
- Productivity analytics (overall progress, daily/weekly/monthly completion charts, recent activity)
- Persistent application settings (theme stored in database)

## Project Folder Structure

```text
.
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── api/                # API client
│   │   ├── components/         # Reusable UI components (TaskCard, modals, dialogs)
│   │   ├── context/            # Theme and toast providers
│   │   ├── layout/             # App shell and sidebar layout
│   │   ├── pages/              # Dashboard, Tasks, History, Categories, Settings pages
│   │   ├── types/              # Shared TypeScript types
│   │   ├── utils/              # Deadline/status utilities
│   │   ├── App.tsx             # Router and app composition
│   │   ├── main.tsx            # Frontend entry point
│   │   └── index.css           # Tailwind/global styles
│   ├── vite.config.ts          # Vite config with /api proxy to backend
│   └── package.json
├── server/                     # Express + Prisma backend
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema (Task, Category, ActivityLog, ApplicationSettings)
│   │   ├── migrations/         # Prisma migrations
│   │   └── dev.db              # SQLite database (created after migration)
│   ├── src/
│   │   ├── routes/             # REST API routes (tasks, categories, history, dashboard, settings)
│   │   ├── utils/              # Activity logging helpers
│   │   ├── prisma.ts           # Prisma client instance
│   │   └── index.ts            # Server entry point and default seeding
│   ├── .env                    # DATABASE_URL and PORT
│   └── package.json
└── README.md
```

## Technologies Used

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts, date-fns, React Router
- **Backend:** Node.js, Express, TypeScript, Zod
- **Database/ORM:** SQLite, Prisma
- **Tooling:** tsx (dev server), Prisma Migrate

## How to Run

### Prerequisites
- Node.js (v18+ recommended; tested with Node 22)
- npm

### 1. Install dependencies

```powershell
cd "server"
npm install

cd "..\client"
npm install
```

### 2. Set up the database (if needed)

The project includes a Prisma schema and migration setup. To create/apply migrations and generate the client:

```powershell
cd "server"
npx prisma generate
npx prisma migrate dev
```

> The SQLite database file is created at `server/prisma/dev.db` (as configured by `server/.env`).

### 3. Start the backend API

```powershell
cd "server"
npm run dev
```

- API runs at: `http://localhost:3001`
- Health check: `http://localhost:3001/api/health`

### 4. Start the frontend

In a separate terminal:

```powershell
cd "client"
npm run dev
```

- Frontend runs at: `http://localhost:5173` (Vite default)
- Vite proxies `/api` requests to `http://localhost:3001`

## Database Storage

- **SQLite file:** `server/prisma/dev.db`
- **Connection config:** `server/.env` (`DATABASE_URL="file:./dev.db"`)
- **Schema & migrations:** `server/prisma/schema.prisma` and `server/prisma/migrations/`

All tasks, categories, activity logs, and application settings are persisted in this database.

## Features Tested

- **API/Backend:** health check, task creation, status/progress updates, task deletion, dashboard stats, history retrieval
- **Persistence:** SQLite database migration and data persistence via Prisma
- **History preservation:** deleting a task preserved activity log entries with task title snapshots (task reference set to null)
- **Frontend/Backend integration:** TypeScript compilation checks passed for both `client` and `server`
- **Dev runtime:** backend and frontend dev servers started successfully (API on port 3001, UI on port 5173)

### Notes
- Deadline states are calculated dynamically based on the current local time and task status (completed tasks are not shown as overdue).
- Default categories (Personal, Work, Learning, Health, Finance, Other) are seeded on server startup if missing.
- Theme preference is stored in application settings and applied on load.
