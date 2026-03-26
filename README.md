# CRM App – Setup & Deployment Guide

A minimalistic web-based CRM built with Node.js, Express, and PostgreSQL.

---

## Project Structure

```
CRM/
├── server.js          ← Express server + all API routes
├── package.json       ← Project dependencies and scripts
├── schema.sql         ← Run this once to create the database tables
├── .env.example       ← Copy to .env and fill in your details
├── .gitignore
└── public/
    ├── index.html     ← The single HTML page
    ├── style.css      ← All styles
    └── app.js         ← All frontend logic (no frameworks)
```

---

## Running Locally (on your computer)

Since your PostgreSQL database is already hosted on Railway, you connect your
local Node.js server directly to it — no local database installation needed.

### Prerequisites
- [Node.js](https://nodejs.org) (v18 or newer) — just the runtime, no PostgreSQL locally
- [VSCode](https://code.visualstudio.com)

### Step 1 – Get your Railway database connection string

1. Go to [railway.app](https://railway.app) and open your project
2. Click on your **PostgreSQL** service
3. Go to the **Connect** tab
4. Copy the **DATABASE_URL** — it looks like:
   `postgresql://postgres:AbCdEf123@monorail.proxy.rlwy.net:12345/railway`

> **Tip:** Railway shows two connection strings — use the one labelled
> **"Public Network"** when running the app on your own computer.
> The "Private Network" one only works inside Railway's own servers.

### Step 2 – Create the database tables (run schema.sql)

You only need to do this once.

1. In your Railway project, click on the **PostgreSQL** service
2. Go to the **Query** tab
3. Open `schema.sql` in VSCode, select all (Ctrl+A), copy it, paste it into
   the Railway query box, and click **Run**
4. You should see the tables created successfully

### Step 3 – Install Node.js dependencies

Open a terminal in your CRM folder (VSCode has a built-in terminal: `Ctrl + `` `) and run:

```bash
npm install
```

### Step 4 – Create your .env file

In the CRM folder, make a copy of `.env.example` and name it `.env`:
- In VSCode Explorer, right-click `.env.example` → Copy → Paste → rename to `.env`
- Or in the terminal: `copy .env.example .env` (Windows) / `cp .env.example .env` (Mac)

Open `.env` and paste in your Railway connection string:

```
DATABASE_URL=postgresql://postgres:AbCdEf123@monorail.proxy.rlwy.net:12345/railway
NODE_ENV=development
PORT=3000
```

### Step 5 – Start the server

```bash
npm start
```

Then open your browser and go to: **http://localhost:3000**

> **Tip for development:** Use `npm run dev` instead of `npm start` to get
> automatic server restarts every time you save a file (powered by nodemon).

---

## Deploying to Railway (hosting the app itself)

Your database is already on Railway. Now you deploy the Node.js app there too
so it runs 24/7 without needing your computer to be on.

### Step 1 – Push your code to GitHub

1. Create a free account at [github.com](https://github.com) if you don't have one
2. Create a new repository called `crm-app`
3. In VSCode, open the terminal in your CRM folder and run these commands
   one at a time:
   ```bash
   git init
   git add .
   git commit -m "Initial CRM app"
   git remote add origin https://github.com/YOUR_USERNAME/crm-app.git
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` with your GitHub username.

### Step 2 – Add the app to your Railway project

1. Go to [railway.app](https://railway.app) and open your existing project
   (the one that already has your PostgreSQL service)
2. Click **New** → **GitHub Repo**
3. Select your `crm-app` repository
4. Railway detects it's a Node.js app and starts deploying automatically

### Step 3 – Link the database

Railway needs to tell your app where the database is.

1. Click on your new **crm-app** service in Railway
2. Go to **Variables**
3. Click **Add Reference Variable** → select `DATABASE_URL` from the PostgreSQL service
4. Also add: `NODE_ENV` = `production`

(`PORT` is set automatically by Railway — you don't need to add it.)

### Step 4 – Done!

Railway will give you a public URL like:
`https://crm-app-production.up.railway.app`

Open that URL in any browser, from anywhere — your CRM is live!

> **Note:** Any changes you make in VSCode → save → `git push` and Railway
> will automatically redeploy within about 30 seconds.

---

## Customising the 5 Custom Fields

1. Open the app in your browser
2. Click the **⚙ (gear)** button in the top-right corner
3. Enter labels for the 5 custom fields (e.g. "Company", "LinkedIn", "Account No.")
4. Click **Save** — the labels update instantly on all customer forms

---

## Making Changes in VSCode

The code is intentionally kept simple. Here's where to look:

| What you want to change | File |
|---|---|
| API routes / server logic | `server.js` |
| Visual design / colours / layout | `public/style.css` |
| Buttons, forms, screen logic | `public/app.js` |
| Page structure / HTML elements | `public/index.html` |
| Database table structure | `schema.sql` (then recreate tables) |

Every file has detailed comments explaining what each section does.

To change the colour scheme, edit the CSS variables at the top of `style.css`:
```css
:root {
  --primary: #2563eb;   /* Change this to any colour you like */
  ...
}
```

---

## API Endpoints Reference

| Method | URL | What it does |
|---|---|---|
| GET | `/api/customers` | List all customers |
| GET | `/api/customers/:id` | Get one customer |
| POST | `/api/customers` | Create customer |
| PUT | `/api/customers/:id` | Update customer |
| DELETE | `/api/customers/:id` | Delete customer |
| GET | `/api/customers/:id/history` | Get contact history (last 10) |
| POST | `/api/customers/:id/history` | Add contact record |
| DELETE | `/api/history/:id` | Delete contact record |
| GET | `/api/settings` | Get settings (field labels) |
| PUT | `/api/settings` | Update settings |
