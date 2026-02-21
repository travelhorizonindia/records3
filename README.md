# Travel Horizon India — Internal Web Application

A full-stack internal management portal for Travel Horizon India, built with React + Vite + Tailwind CSS on the frontend, and Vercel serverless functions as a secure API proxy to Google Sheets.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router v6, Tailwind CSS |
| Hosting | Vercel |
| Data Store | Google Sheets (via Sheets API v4) |
| API Layer | Vercel Serverless Functions (acts as secure proxy) |
| Auth | Environment-variable-based credentials, session in localStorage |

---

## Project Structure

```
travel-horizon/
├── api/                    # Vercel serverless API routes (server-only, never in browser)
│   ├── _sheetsHelper.js    # Google Sheets API JWT auth + CRUD helpers
│   ├── _config.js          # Sheet definitions and spreadsheet IDs
│   ├── auth/
│   │   └── login.js        # POST /api/auth/login — validates credentials
│   └── sheets.js           # GET/POST/PUT /api/sheets?sheet=Name — generic CRUD proxy
├── src/
│   ├── components/
│   │   ├── ui/index.jsx    # All reusable UI components (Button, Input, Table, Modal, etc.)
│   │   └── layout/         # Layout, ProtectedRoute
│   ├── context/            # AuthContext, DataCacheContext
│   ├── hooks/              # useAsync, useAsyncCallback
│   ├── pages/              # DashboardPage, EnquiriesPage, VehiclesPage, etc.
│   ├── services/           # Service layer (vehicleService, driverService, etc.)
│   ├── constants/          # Enums, dropdown options
│   └── utils/              # ID generation, date formatting, currency formatting
├── .env.example            # Template for environment variables
├── vercel.json             # Vercel deployment config
└── package.json
```

---

## Security Architecture

- **Google credentials are NEVER exposed to the browser.** All Sheets API calls go through Vercel serverless functions in `/api/`.
- The JWT for the Google Service Account is signed server-side using the Web Crypto API (no external libraries required).
- User credentials are stored only in Vercel environment variables — not in code or any database.
- Frontend authentication uses a session stored in `localStorage` after a successful login API call.
- Role-based access control is enforced at both the UI level (hiding/disabling admin-only actions) and implicitly in the API (future enhancement).

---

## Setup Instructions

### Step 1: Create Google Cloud Project + Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Google Sheets API** for your project
4. Go to **IAM & Admin → Service Accounts**
5. Create a new service account, download the JSON key file
6. Copy the `client_email` and `private_key` values from the JSON key

### Step 2: Create Google Sheets Workbooks

Create **three** Google Sheets workbooks:

1. **Master Data** — will hold: Vehicles, Drivers, Agents, Customers sheets
2. **Operations** — will hold: EnquiriesBookings, Trips sheets
3. **Financials** — will hold: Payments, DriverAllowances, TollExpenses, ParkingExpenses, StateTaxExpenses, FuelExpenses, VehicleMaintenance, DriverSalary, BusinessExpenses sheets

> **Note:** Sheet tabs (headers) are created automatically by the application on first use. You only need to create the three workbooks.

For each workbook:
- Open the workbook → Share → Add the service account email with **Editor** access
- Copy the spreadsheet ID from the URL: `https://docs.google.com/spreadsheets/d/**SPREADSHEET_ID**/edit`

### Step 3: Configure Environment Variables

Copy `.env.example` to `.env` and fill in all values. For Vercel deployment, add these variables in the Vercel dashboard under **Project Settings → Environment Variables**.

```bash
# Required
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID_MASTER=...
GOOGLE_SHEET_ID_OPERATIONS=...
GOOGLE_SHEET_ID_FINANCIALS=...

# User credentials (add as many as needed, up to USER_10)
USER_1_USERNAME=admin
USER_1_PASSWORD=your_strong_password_here
USER_1_ROLE=admin
USER_2_USERNAME=staff
USER_2_PASSWORD=another_strong_password
USER_2_ROLE=staff
```

> **Important for GOOGLE_PRIVATE_KEY:** When adding to Vercel, paste the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`. Vercel stores multiline values correctly.

### Step 4: Deploy to Vercel

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# In the project root
vercel
```

Follow the prompts. The `vercel.json` handles routing for both the API and SPA.

### Step 5: Local Development

```bash
npm install

# Install Vercel CLI for local serverless function support
npm install -g vercel

# Run locally (includes serverless functions)
vercel dev
```

> Use `vercel dev` instead of `npm run dev` to have the API routes work locally with your environment variables from a local `.env` file.

---

## User Roles

| Feature | Admin | Staff |
|---------|-------|-------|
| View all data | ✅ | ✅ |
| Create/manage enquiries & bookings | ✅ | ✅ |
| Manage master data (vehicles, drivers, agents) | ✅ | ❌ |
| Verify payments & expenses | ✅ | ❌ |
| Soft delete records | ✅ | ❌ |
| Dashboard access | ✅ | ✅ |

---

## Data Flow

```
Browser (React)
    ↓ HTTP request
Vercel Serverless Function (/api/sheets)
    ↓ Signs JWT with service account private key (server-side only)
Google OAuth Token Endpoint
    ↓ Access token
Google Sheets API v4
    ↓ Data
Vercel Serverless Function
    ↓ JSON response
Browser (React)
```

---

## Key Features

- **Auto-generated IDs:** Enquiry IDs (`YYMMDDEXXX`) and Booking IDs (`YYMMBNNN`) are generated based on existing records
- **Soft Deletes:** No data is ever permanently deleted — `isDeleted=true` flag is used throughout
- **Document Expiry Tracking:** Dashboard warns when vehicle documents expire within 30 days
- **Role-based UI:** Admin-only actions are hidden for staff users
- **Responsive Design:** Works on mobile and desktop
- **Client-side Caching:** Basic caching via DataCacheContext to minimize API calls

---

## Adding More Users

Add additional users to Vercel environment variables following the pattern:

```
USER_3_USERNAME=anotherstaff
USER_3_PASSWORD=strong_password
USER_3_ROLE=staff
```

The application supports up to `USER_10`.
