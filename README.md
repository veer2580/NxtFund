# NXTFund

A global startup ecosystem website connecting **Founders, Capital, Technology & Opportunity**. It combines a static, multi-page marketing website (HTML + Tailwind CSS) with an **Express + MongoDB** backend that powers YC-style funding applications, event/blog/startup/partner listings and a contact form.

---

## Tech Stack

| Layer     | Technology                                   |
|-----------|----------------------------------------------|
| Frontend  | HTML5, CSS3, Tailwind CSS (CDN), vanilla JS  |
| Backend   | Node.js, Express 4                           |
| Database  | MongoDB (official `mongodb` driver)          |
| Uploads   | Multer (local disk storage)                  |
| Misc      | dotenv, cors                                 |

---

## Project Structure

```
nxtfund/
├── app.js                  # Express app: middleware, uploads, route mounting, static serving
├── server.js               # Entry point: connects DB and starts the HTTP server
├── package.json
├── .env                    # Environment config (not committed)
├── index.html              # Homepage
├── admin.html              # Admin panel (password login) — served at /admin
├── about.html              # About us
├── startups.html           # Startups section
├── investor-brief.html     # Investors / Advisors & Partners
├── partners.html           # Partners section
├── events.html             # Events section
├── blog-insights.html      # News / Blog insights
├── school.html             # School / education section
├── contact-us.html         # Contact us
├── terms-privacy.html      # Terms & privacy policy
│
├── yc/                     # YC-style multi-step funding application wizard
│   ├── yc-application.html
│   ├── yc-founders.html
│   ├── yc-company.html
│   ├── yc-idea.html
│   ├── yc-video.html
│   ├── yc-equity.html
│   ├── yc-curious.html
│   ├── yc-batch.html
│   ├── yc-progress.html
│   └── yc-submit.html
│
├── routes/                 # Express API route handlers
│   ├── applications.js     # POST /api/applications/submit
│   ├── events.js           # GET /api/events
│   ├── blogs.js            # GET /api/blogs
│   ├── startups.js         # GET /api/startups
│   ├── partners.js         # GET /api/partners
│   ├── contacts.js         # POST /api/contacts/submit
│   ├── auth.js             # Password login, session tokens, auth middleware, password change
│   └── admin.js            # Protected admin endpoints: contacts/applications, content CRUD, stats, settings
│
├── database/
│   ├── db.js               # MongoClient connection + serialization helpers
│   ├── setup.js            # Re-exports db helpers
│   └── seed.js             # Seeds events, blogs, startups, partners, applications, contacts
│
└── assets/
    ├── css/                    # (optional) custom stylesheets
    ├── js/                     # (optional) custom scripts
    ├── images/                 # All site images
    │   ├── logo/               # NXTFund logos
    │   ├── footer/             # Footer background
    │   └── pages/<section>/    # Page-specific images per section
    └── uploads/                # Multer file uploads (gitignored)
```

---

## Getting Started

### Prerequisites

- **Node.js** 16+
- **MongoDB** — a local instance or a cloud cluster (e.g. MongoDB Atlas)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=nxtfund
PORT=3000
ADMIN_PASSWORD=your-secret-admin-password
```

- `MONGODB_URI` — required. If missing, the server will fail to start.
- `MONGODB_DB` — database name (defaults to `nxtfund`).
- `PORT` — server port (defaults to `3000`).
- `ADMIN_PASSWORD` — password for the admin panel. If unset, it falls back to `admin123` (with a warning).

### 3. Seed the database (optional, first run)

```bash
npm run seed
```

This inserts sample data into the `events`, `blogs`, `startups` and `partners` collections with duplicates being skipped automatically.

### 4. Run the server

```bash
npm start        # or npm run dev
```

The server starts at `http://localhost:3000`.

- Main site: `http://localhost:3000/`
- The Express app serves static assets from `assets/` and all `.html` pages at the root.

> **Note:** The static pages reference relative asset paths (e.g. `assets/images/...`). If you open the HTML files directly via `file://` or a simple static server (e.g. Live Server), the marketing pages render fully, but API-backed data, form submissions and the admin panel require the Node server running.

---

## Admin Panel

A password-protected admin dashboard (single page, `admin.html`, no build step). Log in at **`http://localhost:3000/admin`** with `ADMIN_PASSWORD` (password-only, no usernames). It includes:

- **Overview** — dashboard with live stats (messages, applications, events, blogs, startups, partners) and recent submissions.
- **Messages** — contact form submissions with live search, status filters, mark-as-read/replied, and delete.
- **Applications** — funding applications with live search, status filters, expandable full details, status updates and delete.
- **Content Management** — full CRUD (add / edit / delete) for **Events**, **Blog Posts**, **Startups** and **Partners**, with image thumbnails and status badges.
- **Settings** — change the admin password (persisted to `.env` and applied immediately).

Everything loads live from the API — refresh the page or hit **Refresh** on Overview to reload.

---

## API Endpoints

| Method | Endpoint                     | Description                                    |
|--------|------------------------------|------------------------------------------------|
| POST   | `/api/applications/submit`   | Submit a YC-style funding application          |
| POST   | `/api/contacts/submit`       | Submit a contact form message                  |
| POST   | `/api/upload`                | Upload a file (multipart, saved to `assets/uploads/`) |
| GET    | `/api/events`                | List events (optional `?type=upcoming|past`)   |
| GET    | `/api/events/:id`            | Get a single event                             |
| GET    | `/api/blogs`                 | List blogs (optional `?status=` filter)        |
| GET    | `/api/blogs/:id`             | Get a single blog                              |
| GET    | `/api/startups`              | List startups (optional `?status=` filter)     |
| GET    | `/api/startups/:id`          | Get a single startup                           |
| GET    | `/api/partners`              | List partners (optional `?category=` filter)   |
| GET    | `/api/partners/:id`          | Get a single partner                           |
| GET    | `/api/settings`              | Read public site settings                      |
| POST   | `/api/auth/login`            | Admin password login, returns a session token  |
| POST   | `/api/auth/logout`           | Revoke the current admin session               |
| GET    | `/api/auth/check`            | Validate the admin session token               |
| GET    | `/api/admin/stats`           | Dashboard statistics for all collections       |
| GET    | `/api/admin/contacts`        | List contact messages (optional `?status=`, `?q=` search) |
| GET    | `/api/admin/contacts/:id`    | Get a single contact message                   |
| PATCH  | `/api/admin/contacts/:id`    | Update contact status (`unread`/`read`/`replied`) |
| DELETE | `/api/admin/contacts/:id`    | Delete a contact message                       |
| GET    | `/api/admin/applications`    | List applications (optional `?status=`, `?q=` search) |
| GET    | `/api/admin/applications/:id`| Get a single application detail                |
| PATCH  | `/api/admin/applications/:id`| Update application status (`pending`/`reviewed`/`accepted`/`rejected`) |
| DELETE | `/api/admin/applications/:id`| Delete an application                          |
| GET    | `/api/admin/content/:type`   | List content items (`:type` = `events`/`blogs`/`startups`/`partners`; optional `?q=` search) |
| GET    | `/api/admin/content/:type/:id` | Get a single content item                   |
| POST   | `/api/admin/content/:type`   | Create a content item                          |
| PATCH  | `/api/admin/content/:type/:id` | Update a content item                        |
| DELETE | `/api/admin/content/:type/:id` | Delete a content item                        |
| GET    | `/api/admin/settings`        | Get admin settings                             |
| PUT    | `/api/admin/settings`        | Save admin settings                            |
| POST   | `/api/admin/password`        | Change the admin password (`current_password`, `new_password`) |

All `/api/auth/*` and `/api/admin/*` admin endpoints require `Authorization: Bearer <token>`. Content, contacts and applications lists also support a `?q=` search parameter.

---

## Deploying to Vercel

This project runs on Vercel as a **serverless function** (`api/index.js`) that wraps the Express app, with the HTML/YC/assets served as static content (`vercel.json`).

### 1. Configure environment variables

Vercel does **not** ship the local `.env` file. In the Vercel dashboard (**Project → Settings → Environment Variables**) add:

| Name          | Value                                                    |
|---------------|----------------------------------------------------------|
| `MONGODB_URI` | Your MongoDB connection string (Atlas or local)          |
| `MONGODB_DB`  | `nxtfund`                                                  |
| `ADMIN_PASSWORD` | Admin panel password (optional — fallback is the DB-stored password) |
| `JWT_SECRET`  | A random secret for signing admin session tokens (optional) |

If `ADMIN_PASSWORD` is left unset, the admin password comes from the `settings` collection (set via the admin panel's **Change Password**), otherwise it falls back to `admin123`.

### 2. Deploy

```bash
npm install -g vercel
vercel --prod
```

Or push to your Git repo and import it into Vercel — every push to `main` auto-deploys.

### 3. Serverless notes

- **Sessions** are stateless (HMAC-signed tokens), so login works across cold starts.
- **Password changes** are stored (hashed with scrypt) in the MongoDB `settings` collection, so they persist on serverless. For local/self-hosted runs they are also written to `.env`.
- **File uploads** go to `/tmp` on serverless — files are **not persisted** between requests. For persistent uploads, the `assets/uploads/` path only works on self-hosted deployments.
- Main site: `https://<your-domain>/` · Admin: `https://<your-domain>/admin`.

---

## Chat / Form Details

- **Funding Application** (`yc/`): step-by-step wizard covering founders, company, idea, video, equity, batch preference and a final submit that posts to `/api/applications/submit`. Submitted applications get `status: "pending"` and a `submitted_at` timestamp.
- **Contact Form**: posts to `/api/contacts/submit`; requires `name` and `email`.
- **File Uploads**: `/api/upload` accepts a `file` field (up to 100 MB), saves it to `assets/uploads/` and returns `{ filename, path }`.

---

## Database Collections

| Collection    | Used by                  | Common fields                                                     |
|---------------|--------------------------|-------------------------------------------------------------------|
| `events`      | events.html              | title, description, date, time, location, type, image_url          |
| `blogs`       | blog-insights.html       | title, excerpt, content, author, image_url, status                 |
| `startups`    | startups.html            | name, description, sector, website, status                        |
| `partners`    | partners.html            | name, description, category, website, logo_url                     |
| `applications`| YC application wizard    | founder/company/product fields, video_file, demo_file, status, submitted_at |
| `contacts`    | contact-us.html          | name, email, subject, message, file_name, status, created_at       |
| `settings`    | internal / admin         | unique index on `setting_key`; stores admin settings               |

---

## Useful Commands

```bash
npm install       # install dependencies
npm run seed      # seed the database with sample data
npm start         # start the server (production)
npm run dev       # start the server (development)
```

---

## Notes

- `.env` and `assets/uploads/` are gitignored.
- The `database/nxtfund.db` entry in `.gitignore` is a leftover from an earlier backend approach; the current implementation uses MongoDB.
- Static pages use the Tailwind CDN, so an internet connection is needed to load the utility classes and Google Fonts.