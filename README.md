# 🚲 Ride & Chill

> Bike taxi platform for Kokkola, Finland — book a ride in seconds, track in real-time, pay instantly.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql)](https://postgresql.org)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=flat&logo=stripe)](https://stripe.com)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Pricing Model](#pricing-model)
- [WebSocket Events](#websocket-events)
- [Security](#security)
- [Cost Breakdown](#cost-breakdown)
- [Contributing](#contributing)

---

## Overview

Ride & Chill is a full-stack bike taxi platform — think Uber/Bolt but for bikes in a small Finnish city. It consists of four applications:

| App | Description | URL |
|-----|-------------|-----|
| **Web (User PWA)** | Users book rides, track riders, manage wallet | rideandchill.fi |
| **Rider PWA** | Riders go online, accept rides, navigate | rider.rideandchill.fi |
| **Admin Panel** | Operations: approve riders, manage pricing | admin.rideandchill.fi |
| **Backend API** | FastAPI — powers all three apps | api.rideandchill.fi |

All four apps share one backend. No native app stores required — the PWAs install directly to the home screen on iOS and Android.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────┐  │
│  │  User PWA        │  │  Rider PWA       │  │  Admin     │  │
│  │  (Next.js 14)    │  │  (Next.js 14)    │  │  (Next.js) │  │
│  │  rideandchill.fi │  │  rider.r&c.fi    │  │  admin.r&c │  │
│  └────────┬────────┘  └────────┬────────┘  └─────┬──────┘  │
└───────────┼─────────────────────┼─────────────────┼─────────┘
            │  HTTPS + WebSocket  │                 │
┌───────────▼─────────────────────▼─────────────────▼─────────┐
│                       BACKEND LAYER                          │
│                                                             │
│              FastAPI 0.109  (api.rideandchill.fi)           │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  Auth    │ │  Rides   │ │  Wallet  │ │  WebSocket   │  │
│  │  Router  │ │  Router  │ │  Router  │ │  Manager     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Pricing  │ │ Payment  │ │  Promo   │ │ Notification │  │
│  │ Service  │ │ Service  │ │ Service  │ │ Service      │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                        DATA LAYER                            │
│                                                             │
│   PostgreSQL 16           Redis 7          Cloudinary       │
│   (primary store)         (cache/OTP)      (images)         │
└─────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                     EXTERNAL SERVICES                        │
│                                                             │
│   Stripe (payments)    Firebase (push)    Twilio (SMS OTP)  │
│   Mapbox (maps/geo)    Google OAuth       SMTP (email)      │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| FastAPI | 0.109 | REST API + WebSocket |
| SQLAlchemy | 2.0 | ORM |
| Alembic | 1.13 | Database migrations |
| PostgreSQL | 16 | Primary database |
| Redis | 7 | OTP storage, token blacklist, caching |
| Pydantic | v2 | Request/response validation |
| python-jose | 3.3 | JWT auth |
| Stripe SDK | 8.5 | Payments + payouts |
| Firebase Admin | 6.4 | Push notifications |
| Twilio | 8.12 | SMS OTP |

### Frontend (all three apps)
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.1 | React framework (App Router) |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 3.4 | Styling |
| @ducanh2912/next-pwa | 10.2 | PWA (service worker, offline) |
| Mapbox GL JS | 3.1 | Interactive maps |
| Zustand | 4.5 | State management |
| SWR | 2.2 | Data fetching + caching |
| Stripe.js | 3.0 | Payment UI |
| Recharts | 2.12 | Admin charts |
| lucide-react | 0.323 | Icons |

---

## Features

### User App
- **Auth**: Email/password, phone OTP, Google OAuth
- **Booking**: Auto-detect location, destination search, drag map markers
- **Pricing**: Real-time estimate with surge indicator before confirmation
- **Tracking**: Live rider location via WebSocket (5-second updates)
- **Payments**: In-app wallet, card, Apple Pay, Google Pay, cash
- **Promos**: Percentage off, fixed discount, free ride codes
- **Referrals**: Unique referral code, both parties get wallet credit
- **History**: Past rides with receipt download
- **Ratings**: 1–5 stars + tip after ride

### Rider App
- **Registration**: Multi-step with document upload (ID, bike photo)
- **Approval Gate**: Cannot go online until admin approves
- **Online/Offline**: Prominent toggle with Wake Lock (screen stays on)
- **Ride Requests**: 30-second timer card with accept/decline
- **Navigation**: Two-phase Mapbox navigation (pickup → dropoff)
- **Earnings**: Live counter, today/weekly breakdown, Stripe Connect withdrawal
- **GPS**: Continuous location updates every 5 seconds (REST, battery-efficient)

### Admin Panel
- **Dashboard**: KPI cards (rides, revenue, active riders, new users) + 30-day charts
- **Live Map**: Real-time view of all riders and active rides
- **Rider Approval**: Review documents, approve/reject with reason
- **Pricing Config**: Live update of all fare parameters
- **Promo Codes**: Full CRUD with usage tracking
- **Reports**: CSV export of revenue and rides

---

## Project Structure

```
ride-and-chill/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py             # App entry point + CORS + routers
│   │   ├── config.py           # Settings (pydantic-settings)
│   │   ├── database.py         # SQLAlchemy engine + session
│   │   ├── models/             # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── rider.py        # Rider + RiderDocument
│   │   │   ├── ride.py
│   │   │   ├── wallet.py       # Wallet + WalletTransaction
│   │   │   ├── promo.py        # PromoCode + PromoUsage
│   │   │   ├── rating.py
│   │   │   ├── payment.py
│   │   │   ├── notification.py
│   │   │   └── saved_place.py
│   │   ├── schemas/            # Pydantic v2 request/response schemas
│   │   ├── routers/            # FastAPI routers
│   │   │   ├── auth.py
│   │   │   ├── rides.py
│   │   │   ├── riders.py
│   │   │   ├── wallet.py
│   │   │   ├── promos.py
│   │   │   ├── ratings.py
│   │   │   ├── payments.py     # Stripe webhook
│   │   │   ├── users.py
│   │   │   ├── admin.py
│   │   │   └── ws.py           # WebSocket + ConnectionManager
│   │   ├── services/           # Business logic
│   │   │   ├── auth_service.py
│   │   │   ├── pricing_service.py
│   │   │   ├── payment_service.py
│   │   │   ├── wallet_service.py
│   │   │   ├── promo_service.py
│   │   │   ├── notification_service.py
│   │   │   └── ride_service.py
│   │   └── utils/
│   │       ├── security.py     # JWT, bcrypt, OTP, referral codes
│   │       ├── deps.py         # FastAPI dependencies (auth guards)
│   │       └── geo.py          # Haversine distance, duration estimate
│   ├── alembic/                # Database migrations
│   ├── tests/                  # pytest test suite
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_pricing.py
│   │   ├── test_rides.py
│   │   ├── test_wallet.py
│   │   ├── test_promos.py
│   │   ├── test_admin.py
│   │   ├── test_websocket.py
│   │   └── test_geo.py
│   ├── seed.py                 # Development seed data
│   ├── requirements.txt
│   └── Dockerfile
│
├── web/                        # User-facing PWA (Next.js 14)
│   ├── app/
│   │   ├── (auth)/             # Login, signup, OTP verify
│   │   └── (main)/             # Home/map, booking, tracking, wallet, history, profile
│   ├── components/
│   │   ├── map/                # MapView (Mapbox)
│   │   ├── ride/               # PriceBreakdown, RideCard
│   │   └── ui/                 # BottomNav, OTPInput, StatusBanner
│   ├── lib/
│   │   ├── api.ts              # Axios + interceptors + all endpoints
│   │   ├── hooks/              # useWebSocket, useGeolocation, useWakeLock
│   │   └── store/              # authStore, rideStore (Zustand)
│   ├── public/
│   │   ├── manifest.json
│   │   └── icons/              # PWA icons (192, 512, 180 iOS)
│   └── __tests__/              # Jest + RTL tests
│
├── rider/                      # Rider PWA (Next.js 14)
│   ├── app/
│   │   ├── (auth)/             # Rider login + multi-step registration
│   │   └── (main)/             # Dashboard, earnings, profile
│   ├── components/
│   │   ├── IncomingRideCard.tsx # 30s countdown overlay
│   │   ├── RideNavigation.tsx  # Mapbox navigation
│   │   └── EarningsCounter.tsx
│   ├── lib/
│   │   ├── hooks/              # useRiderWebSocket, useWakeLock, useRiderLocation
│   │   └── store/              # riderAuthStore, riderDutyStore
│   └── __tests__/              # Jest + RTL tests
│
├── admin/                      # Admin panel (Next.js 14)
│   ├── app/
│   │   └── (main)/             # Dashboard, live-map, users, riders, rides, pricing, promos, reports
│   ├── components/
│   │   ├── ui/                 # StatCard, DataTable, StatusBadge, Modal, Sidebar
│   │   └── charts/             # RidesChart, RevenueChart, PaymentMethodDonut
│   └── __tests__/              # Jest + RTL tests
│
├── docker-compose.yml          # Local dev: PostgreSQL + Redis + backend
├── .env.example                # All required environment variables
├── .gitignore
└── README.md
```

---

## Prerequisites

- **Node.js** 20+ and npm/pnpm
- **Python** 3.12+
- **Docker** and Docker Compose (for local PostgreSQL + Redis)
- **Git**

Accounts needed for production (all have free tiers for development):
- [Stripe](https://stripe.com) — payments
- [Mapbox](https://mapbox.com) — maps
- [Firebase](https://firebase.google.com) — push notifications
- [Twilio](https://twilio.com) — SMS OTP
- [Cloudinary](https://cloudinary.com) — image storage

---

## Local Development

### 1. Clone the repo

```bash
git clone https://github.com/your-org/ride-and-chill.git
cd ride-and-chill
```

### 2. Start infrastructure

```bash
docker compose up postgres redis -d
```

This starts:
- PostgreSQL 16 on `localhost:5432`
- Redis 7 on `localhost:6379`

### 3. Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Copy env file
cp ../.env.example .env
# Edit .env with your keys (minimum: Stripe test keys + Mapbox token)

# Run migrations
alembic upgrade head

# Seed test data
python seed.py

# Start API server
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 4. User web app

```bash
cd web
cp .env.local.example .env.local
npm install
npm run dev    # http://localhost:3000
```

### 5. Rider app

```bash
cd rider
cp .env.local.example .env.local
npm install
npm run dev    # http://localhost:3001
```

### 6. Admin panel

```bash
cd admin
cp .env.local.example .env.local
npm install
npm run dev    # http://localhost:3002
```

### Default test credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rideandchill.fi | admin123 |
| User | user1@test.com | test123 |
| Rider | rider1@test.com | test123 |

---

## Environment Variables

Full list in `.env.example`. Minimum required for local dev:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/rideandchill
REDIS_URL=redis://localhost:6379
SECRET_KEY=any-random-string-32-chars-min
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
```

All other keys (Firebase, Twilio, Cloudinary) are optional in development — features that require them will gracefully degrade with a log warning.

---

## Running Tests

### Backend (pytest)

```bash
cd backend
pytest tests/ -v --tb=short
```

Test coverage:
- `test_auth.py` — signup, login, OTP, JWT refresh, token blacklist (8 tests)
- `test_pricing.py` — fare calculation, surge, e-bike premium, promos, min fare (6 tests)
- `test_rides.py` — estimate, request, cancel, history (4 tests)
- `test_wallet.py` — balance, topup, deduct, insufficient funds, atomicity (5 tests)
- `test_promos.py` — validation, expiry, max uses, min order, free ride, reuse (6 tests)
- `test_admin.py` — stats, rider approval, admin auth guard (4 tests)
- `test_websocket.py` — connection, auth, message delivery (4 tests)
- `test_geo.py` — haversine accuracy, edge cases (3 tests)

```bash
# Run with coverage report
pytest tests/ --cov=app --cov-report=html
open htmlcov/index.html
```

### Frontend (Jest + React Testing Library)

```bash
# User web app
cd web && npm test

# Rider app
cd rider && npm test

# Admin panel
cd admin && npm test
```

---

## Deployment

### Overview

| Component | Platform | URL |
|-----------|----------|-----|
| Backend | Railway | api.rideandchill.fi |
| User PWA | Vercel | rideandchill.fi |
| Rider PWA | Vercel | rider.rideandchill.fi |
| Admin | Vercel | admin.rideandchill.fi |
| Database | Railway (PostgreSQL) | — |
| Cache | Railway (Redis) | — |

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Ride & Chill platform"
git remote add origin https://github.com/your-org/ride-and-chill.git
git push -u origin main
```

### Step 2: Deploy backend to Railway

```bash
npm install -g @railway/cli
railway login
cd backend
railway init
railway add postgresql
railway add redis
```

Set environment variables in Railway dashboard (Settings → Variables). Copy all variables from `.env.example` and fill in production values.

```bash
railway up
railway run alembic upgrade head
```

Custom domain: Railway → Settings → Domains → Add `api.rideandchill.fi`

### Step 3: Deploy web apps to Vercel

```bash
npm install -g vercel
```

**User app:**
```bash
cd web
vercel deploy --prod
vercel domains add rideandchill.fi
```

Set env vars in Vercel dashboard:
```
NEXT_PUBLIC_API_URL=https://api.rideandchill.fi
NEXT_PUBLIC_WS_URL=wss://api.rideandchill.fi
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Rider app:**
```bash
cd rider
vercel deploy --prod
vercel domains add rider.rideandchill.fi
```

**Admin panel:**
```bash
cd admin
vercel deploy --prod
vercel domains add admin.rideandchill.fi
```

### Step 4: DNS configuration

At your domain registrar (Traficom for .fi domains):

```
Type    Name     Value
A       @        76.76.21.21        (Vercel)
CNAME   www      cname.vercel-dns.com
CNAME   rider    cname.vercel-dns.com
CNAME   admin    cname.vercel-dns.com
A       api      [Railway IP]
```

### Step 5: Stripe production setup

1. Activate your Stripe account (business details required)
2. Switch to live mode → copy `pk_live_` and `sk_live_` keys
3. Register webhook: `https://api.rideandchill.fi/payments/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
4. Enable Stripe Connect for rider payouts
5. Add domain to Apple Pay: Stripe Dashboard → Payment Methods → Apple Pay

### Step 6: Firebase push notifications

1. Create Firebase project at console.firebase.google.com
2. Project Settings → Service Accounts → Generate new private key (JSON)
3. Base64-encode the JSON: `base64 -i firebase-key.json`
4. Set `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64` in Railway

### Step 7: Twilio SMS OTP

1. Buy a Finnish phone number (~€1/month)
2. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` in Railway

### Step 8: CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: testdb
        ports: ["5432:5432"]
      redis:
        image: redis:7
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r backend/requirements.txt
      - run: pytest backend/tests/ -v
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
          SECRET_KEY: test-secret-key

  deploy-backend:
    needs: test-backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: railwayapp/railway-action@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
          service: backend

  deploy-web:
    needs: test-backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_WEB_PROJECT_ID }}
          working-directory: ./web
          vercel-args: "--prod"
```

---

## API Reference

### Authentication

All protected endpoints require: `Authorization: Bearer <access_token>`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/signup/email` | Register with email+password | — |
| POST | `/auth/signup/phone` | Register with phone (sends OTP) | — |
| POST | `/auth/verify/phone` | Verify OTP | — |
| POST | `/auth/login/email` | Login with email+password | — |
| POST | `/auth/login/google` | Login with Google ID token | — |
| POST | `/auth/refresh` | Refresh access token | — |
| POST | `/auth/logout` | Blacklist refresh token | User |

### Rides

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/rides/estimate` | Get price estimate | User |
| POST | `/rides/request` | Book a ride | User |
| GET | `/rides/{id}` | Get ride details | User |
| GET | `/rides/history` | User's ride history | User |
| POST | `/rides/{id}/cancel` | Cancel ride | User |
| POST | `/rides/{id}/tip` | Add tip | User |
| POST | `/rides/{id}/arrived` | Mark rider arrived | Rider |
| POST | `/rides/{id}/start` | Start trip | Rider |
| POST | `/rides/{id}/complete` | Complete trip | Rider |

### Wallet

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/wallet` | Balance + recent transactions | User |
| GET | `/wallet/transactions` | Full transaction history | User |
| POST | `/wallet/topup` | Create Stripe payment intent | User |
| GET | `/wallet/topup/{intent_id}` | Confirm topup | User |

### Admin

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/stats/today` | Today's KPIs | Admin |
| GET | `/admin/stats/chart` | 30-day chart data | Admin |
| GET | `/admin/rides/live` | Active rides | Admin |
| GET | `/admin/users` | User list | Admin |
| GET | `/admin/riders/pending` | Pending approvals | Admin |
| POST | `/admin/riders/{id}/approve` | Approve rider | Admin |
| POST | `/admin/riders/{id}/reject` | Reject rider with reason | Admin |
| GET | `/admin/pricing` | Current pricing config | Admin |
| PATCH | `/admin/pricing` | Update pricing | Admin |
| GET | `/admin/reports/revenue` | Revenue CSV export | Admin |

Full interactive API docs: `https://api.rideandchill.fi/docs`

---

## Pricing Model

Pricing is **only calculated server-side** — never in the frontend.

```
Base fare:        €3.00
Rate per km:      €1.50 / km
E-bike premium:   +10%
Surge multiplier: ×1.5 (nights 22:00–06:00, weekends)
Minimum fare:     €4.00
```

**Example calculation (3 km, standard bike, no surge, no promo):**
```
Base:             €3.00
Distance (3 km):  €4.50
Subtotal:         €7.50
Final:            €7.50
```

**Same ride during surge:**
```
Subtotal × 1.5:   €11.25
Final:            €11.25
```

---

## WebSocket Events

### User channel: `WS /ws/user/{user_id}?token=<jwt>`

| Event | Payload | Description |
|-------|---------|-------------|
| `ride_accepted` | `{rider: {...}, eta_minutes: number}` | Rider accepted the ride |
| `rider_location` | `{lat: number, lng: number}` | Rider GPS update |
| `rider_arrived` | `{ride_id: string}` | Rider at pickup |
| `ride_started` | `{ride_id: string}` | Trip in progress |
| `ride_completed` | `{ride_id: string, final_price: number}` | Trip done |
| `ride_cancelled` | `{ride_id: string, reason: string}` | Ride cancelled |

### Rider channel: `WS /ws/rider/{rider_id}?token=<jwt>`

| Event | Payload | Description |
|-------|---------|-------------|
| `new_ride_request` | `{ride: {...}, expires_at: timestamp}` | Incoming ride (30s timer) |
| `ride_cancelled` | `{ride_id: string}` | User cancelled |

---

## Security

| Concern | Mitigation |
|---------|-----------|
| SQL injection | SQLAlchemy ORM parameterized queries |
| XSS | Next.js escapes all output by default |
| CSRF | JWT-based auth (no cookies in web flows) |
| Brute force | Rate limiting on auth endpoints (add slowapi) |
| JWT leakage | Short expiry (60min), refresh blacklist in Redis |
| Webhook spoofing | Stripe signature verification on all webhook events |
| WebSocket auth | JWT required as query param on connection |
| Passwords | bcrypt hashing, never stored plain |
| Secrets | Environment variables, never in code |
| CORS | Restricted to known origins in production |

### Known gaps for production hardening (see `New Text Document.txt`):
- [ ] Add `slowapi` rate limiting to auth and OTP endpoints
- [ ] Add security headers (`X-Frame-Options`, `CSP`) to Next.js configs
- [ ] Add WebSocket auth check on every message (not just on connect)
- [ ] Configure DB connection pool limits explicitly
- [ ] Add Stripe webhook idempotency key handling
- [ ] Add Sentry error tracking

---

## Cost Breakdown

### Monthly fixed costs (MVP, ~100 rides/month)

| Service | Plan | Cost |
|---------|------|------|
| Railway (backend + DB + Redis) | Hobby | €5/month |
| Vercel (3 apps) | Free | €0 |
| Twilio SMS (100 OTPs) | Pay-as-go | ~€5 |
| Firebase | Free | €0 |
| Cloudinary | Free (25GB) | €0 |
| Mapbox | Free (50k loads) | €0 |
| Domain (rideandchill.fi) | Annual | ~€1.25/mo |
| **Total fixed** | | **~€11/month** |

### Variable costs (per transaction)
- Stripe: 2.9% + €0.25 per payment

### Break-even analysis

| Rides/month | Revenue (avg €8) | Stripe fees | Fixed | Profit |
|------------|-----------------|-------------|-------|--------|
| 100 | €800 | €52 | €11 | €737 |
| 500 | €4,000 | €262 | €11 | €3,727 |
| 1,000 | €8,000 | €524 | €11 | €7,465 |

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Write tests for your changes
4. Ensure all tests pass: `pytest backend/tests/` + `npm test` in each app
5. Submit a pull request

### Code style
- Backend: Black + isort (`black app/ && isort app/`)
- Frontend: ESLint + Prettier (configured in each app)

---

## License

MIT © Ride & Chill 2026

---

*Built for Kokkola, Finland 🇫🇮 — where the bay meets the bike.*
