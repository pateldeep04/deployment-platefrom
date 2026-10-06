# DeployHub — Developer Deployment & Hosting Platform
> **Tagline:** Deploy. Host. Scale.

DeployHub is a developer-first multi-tenant cloud deployment and hosting platform for Static HTML/CSS/JS, React, Vite, and isolated PHP applications.

---

## 🏗️ System Architecture

```
INTERNET
   │
   ▼
┌───────────────────────────────────────────────┐
│        DeployHub Edge Router / Proxy          │
│   Serves *.deployhub.local & Custom Domains   │
└──────────────────────┬────────────────────────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
┌────────────────────┐      ┌─────────────────────────┐
│ React Frontend Web │      │   Deployed Tenant Sites │
│  (Port 3000)       │      │  Static & Isolated PHP  │
└─────────┬──────────┘      └─────────────────────────┘
          │
          ▼
┌───────────────────────────────────────────────┐
│       Core REST API Server (Port 5000)        │
│   Express + TypeScript + JWT + Zod + Multer   │
└─────────┬──────────────────┬──────────────────┘
          │                  │
          ▼                  ▼
┌──────────────────┐   ┌────────────────────────┐
│ MongoDB Database │   │ Redis + BullMQ Queue   │
│ (Metadata/Users) │   │ (Deployment Pipeline)  │
└──────────────────┘   └───────────┬────────────┘
                                   │
                                   ▼
                       ┌────────────────────────┐
                       │   Deployment Worker    │
                       │ Safe Unpack & Sandbox  │
                       └───────────┬────────────┘
                                   │
                                   ▼
                       ┌────────────────────────┐
                       │  Disk / Object Storage │
                       │ Uploads, Artifacts,    │
                       │ Live Tenant Sites      │
                       └────────────────────────┘
```

---

## 🔒 Security Architecture

1. **Non-Root & Isolated Workers:** User builds and unpacking never execute on the API server.
2. **Path Traversal Protection:** Every archive entry is inspected and canonicalized. Paths containing `../`, leading slashes, or absolute drives are blocked.
3. **ZIP Bomb Explosion Protection:** Decompressed size is verified against user plan storage quotas, and compression ratios greater than 100:1 are aborted.
4. **Malicious Executable Screening:** Binary extensions (`.exe`, `.bat`, `.cmd`, `.sh`, `.msi`) are rejected.
5. **Secret Masking:** Environment variables are masked and never exposed to unauthenticated endpoints.

---

## 📁 Unified Project Directory Layout

```
deployhub/
├── public/                 # Static web assets & favicons
├── server/                 # Express REST API, Edge Router & BullMQ Queue
│   ├── config/             # Environment & storage paths
│   ├── controllers/        # Project, Deployment, Domain, & Billing controllers
│   ├── database/           # Mongoose models & in-memory store
│   ├── middleware/         # JWT Auth, Rate Limiter & Security Validators
│   ├── queue/              # Deployment worker pipeline & ZIP unpacker
│   ├── router/             # Edge proxy host routing (*.pateldeeep.me)
│   ├── routes/             # Versioned REST API endpoints (/api/v1)
│   ├── validators/         # Zod schemas
│   └── index.ts            # Core Server entrypoint
├── src/                    # React 18 + Vite + TypeScript + Tailwind Frontend
│   ├── components/         # Common UI, Navbar, AdBanner, Modals
│   ├── context/            # Authentication & State
│   ├── pages/              # Landing (InfinityFree style), Dashboard, Billing
│   ├── services/           # Axios API client
│   └── types/              # Shared TypeScript definitions
├── storage/
│   ├── uploads/            # Temporary staged ZIP archives
│   ├── artifacts/          # Versioned immutable builds
│   └── sites/              # Live deployed tenant websites
├── .dockerignore
├── .env                    # Environment configuration (pateldeeep.me)
├── .env.example
├── DOCKER_DEPLOYMENT.md    # Docker container instructions
├── docker-compose.yml      # App, MongoDB, Redis orchestration
├── Dockerfile              # Production container build
├── ecosystem.config.cjs    # PM2 process manager config
├── index.html              # Frontend HTML entrypoint
├── nodemon.json            # Server development watcher
├── package.json            # Unified package scripts & dependencies
├── PM2_DEPLOYMENT.md       # PM2 production deployment guide
├── README.md
├── SECURITY.md             # Security architecture & limits
├── tailwind.config.js      # Styling configuration
├── tsconfig.json           # Frontend TypeScript configuration
└── vite.config.js          # Vite bundler & reverse proxy
```

---

## ⚡ Quick Start (Run with One Line)

### 1. Install Dependencies (First Time Only)
```bash
npm install
```

### 2. Run Both Server & Frontend Concurrently (One Command)
```bash
npm run dev
```

> **What happens in that one command:**
> - 🟢 **Frontend (Vite):** Starts on `http://localhost:3000`
> - 🔵 **Backend & Edge Proxy (Express):** Starts on `http://localhost:5000`
> - 🔄 Proxies `/api` and `/sites` seamlessly with instant hot reload.


---

## 🔑 Pre-Seeded Demo Accounts (1-Click Login Available)

| Account | Email | Password | Role | Plan |
|---|---|---|---|---|
| **Admin** | `admin@deployhub.com` | `AdminDeployHub2026!` | `ADMIN` | `PRO` (Access to `/admin`) |
| **Developer** | `developer@deployhub.com` | `Developer2026!` | `USER` | `DEVELOPER` |

---

## 📡 REST API Endpoints

- `POST /api/v1/auth/register` — User registration with Argon2/bcrypt
- `POST /api/v1/auth/login` — Authentication & JWT access + refresh tokens
- `GET /api/v1/projects` — List user's deployed projects
- `POST /api/v1/projects` — Create new project (Static, PHP, React, Vite)
- `POST /api/v1/projects/:id/deploy` — Upload ZIP and trigger worker pipeline
- `GET /api/v1/deployments/:id/logs` — Real-time streaming terminal logs
- `POST /api/v1/deployments/:id/rollback` — Instant zero-downtime version rollback
- `GET /api/v1/projects/:id/env` — Masked environment variables
- `POST /api/v1/projects/:id/domains` — Custom domain CNAME attachment & SSL
- `GET /api/v1/billing/plans` — Subscription plans (Free, Developer, Pro)
- `POST /api/v1/billing/checkout` — Razorpay payment order generation
- `GET /api/v1/admin/stats` — Global telemetry and platform statistics
- `GET /api/v1/admin/ads` — Advertisement manager & CTR analytics
- `GET /sites/:slug/` — Live edge router for deployed static & PHP tenant sites
