# SkillSphere – MERN Marketplace MVP

SkillSphere is a full-stack freelance marketplace platform built with MERN (MongoDB, Express, React, Node.js). It supports real-time messaging, Stripe payments, OAuth, and includes comprehensive testing and production-ready hardening.

---

## Architecture

- **Backend**: Express.js + Node.js, MongoDB with Mongoose, Socket.IO for real-time chat
- **Frontend**: React 19 + Vite, TailwindCSS, Vitest + Playwright for testing
- **Infrastructure**: Docker & Docker Compose, GitHub Actions CI/CD
- **Security**: Helmet, express-rate-limit, JWT auth, Stripe webhook verification
- **Database**: MongoDB with in-memory fallback (testing) or external URI (production)

---

## Features Implemented

### Core Marketplace
- ✅ User authentication (JWT-based register/login)
- ✅ Email verification and password reset flows
- ✅ Google OAuth via Passport
- ✅ User profiles (freelancer & client roles)
- ✅ Gig creation and search
- ✅ Proposal/bid system
- ✅ Review and rating system

### Payments & Transactions
- ✅ Stripe Checkout integration
- ✅ Webhook handling (idempotent payment status updates)
- ✅ Payment history and tracking
- ✅ Dispute resolution

### Real-Time Features
- ✅ Socket.IO messaging (direct chat between users)
- ✅ Room-based message delivery
- ✅ Message persistence (MongoDB)

### Admin & Moderation
- ✅ Admin dashboard
- ✅ User management
- ✅ Dispute management
- ✅ Analytics & notifications

### Production Hardening
- ✅ Environment validation (fails if critical vars missing in production)
- ✅ Security headers (Helmet)
- ✅ Request rate limiting (200 req/15min per IP)
- ✅ Logging (Morgan)
- ✅ Error handling with graceful fallbacks

### Testing & Quality
- ✅ Backend tests (Jest + supertest)
- ✅ Frontend unit tests (Vitest + Testing Library)
- ✅ E2E tests (Playwright)
- ✅ CI pipeline (GitHub Actions: backend tests, frontend unit, Playwright e2e)

---

## Local Development Setup

### Prerequisites
- Node.js ≥ 18 LTS
- MongoDB (local or Docker)
- Git

### Installation

1. **Clone & install dependencies:**
```bash
cd SkillSphere
cd backend && npm install
cd ../frontend && npm install --legacy-peer-deps  # React 19 compatibility
```

2. **Create `.env` file in `backend/`:**
```env
# Database
MONGO_URI=mongodb://localhost:27017/SkillSphere

# JWT & auth
JWT_SECRET=your_secret_key_here_min_32_chars
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Stripe (optional, required for payments)
STRIPE_SECRET=sk_test_your_stripe_secret
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Razorpay (optional, required for Razorpay checkout)
RAZORPAY_KEY_ID=rzp_test_your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Email/SMTP (optional, fallback to no-op)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_pass
EMAIL_FROM=no-reply@skillsphere.local

# Optional
NODE_ENV=development
PORT=5000
```

3. **Start MongoDB (if running locally):**
```bash
mongod
# or via Docker:
docker run -d -p 27017:27017 --name mongo mongo:latest
```

4. **Run development servers:**
```bash
# Terminal 1: Backend
cd backend
npm run dev
# Server starts at http://localhost:5000

# Terminal 2: Frontend
cd frontend
npm run dev
# Frontend starts at http://localhost:5173
```

---

## Testing

### Backend Tests
```bash
cd backend
npm test
# Runs Jest + supertest
# Uses in-memory MongoDB when MONGO_URI is not set
```

### Frontend Unit Tests
```bash
cd frontend
npm run test:unit
# Runs Vitest on src/**/*.test.jsx files only
```

### End-to-End Tests (Playwright)
```bash
cd frontend
npm run test:e2e
# Launches Playwright; requires dev server running or Vite webServer config
# Or for headless CI:
npm run test:e2e:ci
```

---

## Docker & Compose

### Build & Run with Docker Compose

```bash
docker compose up --build
```

This starts:
- **MongoDB** (port 27017, internal `mongodb://mongo:27017/SkillSphere`)
- **Backend** (port 5000, internal)
- **Frontend** (port 5173, served via nginx)

**Note:** Frontend `.env` is baked into the Docker image. To update it, edit `frontend/.env.docker` or rebuild.

### Individual Builds
```bash
# Backend
cd backend
docker build -t skillsphere-backend .
docker run -p 5000:5000 --env-file .env skillsphere-backend

# Frontend
cd frontend
docker build -t skillsphere-frontend .
docker run -p 5173:5173 skillsphere-frontend
```

---

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main`:

1. **Backend Tests**: Jest + supertest (in-memory DB)
2. **Frontend Unit Tests**: Vitest (project tests only, `src/**/*.test.jsx`)
3. **Frontend E2E Tests**: Playwright (with dev server)

All tests must pass before merging. See workflow file for details.

---

## Deployment

### Environment Validation
In production (`NODE_ENV=production`), the backend enforces:
- `MONGO_URI` must be set
- `JWT_SECRET` must be set

### Recommended Platforms
- **Heroku** (free tier available, good for MVP)
- **Railway** (simple, GitHub integration)
- **Render** (generous free tier)
- **AWS ECS** (scalable, pay-per-use)
- **DigitalOcean** (App Platform or Droplets)

### Stripe Webhook Setup
1. **Local testing**: Use `stripe-cli` or `ngrok` to forward webhooks to `http://localhost:5000/api/payments/webhook`
   ```bash
   stripe listen --forward-to localhost:5000/api/payments/webhook
   stripe trigger payment_intent.succeeded  # for testing
   ```

2. **Production**: Configure Stripe Dashboard → Developers → Webhooks:
   - Endpoint URL: `https://yourdomain.com/api/payments/webhook`
   - Events: `checkout.session.completed`
   - Secret: Add to `.env` as `STRIPE_WEBHOOK_SECRET`

---

## Key API Endpoints

### Auth
- `POST /api/auth/register` – Register new user
- `POST /api/auth/login` – Login & get JWT
- `GET /api/auth/google` – OAuth redirect
- `GET /api/auth/verify?token=...` – Verify email
- `POST /api/auth/forgot-password` – Send reset link
- `POST /api/auth/reset-password` – Reset password

### Marketplace
- `GET /api/gigs` – List all gigs
- `POST /api/gigs` – Create gig (protected)
- `POST /api/proposals` – Submit proposal (protected)
- `GET /api/reviews` – List reviews

### Payments
- `POST /api/payments/checkout` – Create Stripe Checkout session (protected)
- `POST /api/payments/webhook` – Stripe webhook (raw body, no auth needed)

### Real-Time Chat
- Socket events: `private_message`, `message` (Socket.IO)

### Admin
- `GET /api/admin/users` – List users (admin only)
- `GET /api/admin/disputes` – List disputes (admin only)

---

## Troubleshooting

### Port 5000 already in use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :5000
kill -9 <PID>
```

Note: the backend now attempts a graceful fallback when the configured port is busy. On startup it will try the configured PORT (default 5000), and if occupied will try subsequent ports (5001, 5002, ...) up to a small limit. This helps local development avoid manual process termination — set PORT in your `.env` if you prefer a fixed alternative.

### MongoDB connection refused
- Ensure MongoDB is running: `mongod` or Docker container
- Check `MONGO_URI` in `.env`
- If using in-memory DB (tests), it auto-starts when `MONGO_URI` is missing

### Vitest includes node_modules tests
- Ensure `frontend/vitest.config.js` has `include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}']`
- Also set `exclude: ['**/node_modules/**', '**/tests/e2e/**']`

### Playwright browser not found
```bash
cd frontend
npx playwright install --with-deps
```

---

## Project Structure

```
SkillSphere/
├── backend/
│   ├── app.js                    # Express factory (for tests)
│   ├── server.js                 # Server entry point
│   ├── config/
│   │   ├── db.js                 # MongoDB connection
│   │   ├── passport.js           # OAuth setup
│   │   └── validateEnv.js        # Environment validation
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── paymentController.js
│   │   ├── webhookController.js
│   │   └── ...
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   ├── tests/
│   │   └── auth.test.js
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── components/__tests__/  # Unit tests
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tests/
│   │   └── e2e/                   # Playwright tests
│   ├── vitest.config.js
│   ├── playwright.config.cjs
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── docker-compose.yml
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI
└── README.md
```

---

## Environment Variables Summary

| Var | Required | Description |
|-----|----------|-------------|
| `MONGO_URI` | ✅ (prod) | MongoDB connection string |
| `JWT_SECRET` | ✅ (prod) | Secret for JWT signing (min 32 chars) |
| `FRONTEND_URL` | ✅ | Frontend origin (CORS, OAuth redirect) |
| `BACKEND_URL` | ✅ | Backend origin (used by frontend API client) |
| `STRIPE_SECRET` | ❌ | Stripe API key (required for payments) |
| `STRIPE_WEBHOOK_SECRET` | ❌ | Webhook verification secret |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ❌ | Google OAuth secret |
| `GOOGLE_REDIRECT_URI` | ❌ | OAuth redirect (default: `{BACKEND_URL}/api/auth/google/callback`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | ❌ | Email config (falls back to no-op if missing) |
| `EMAIL_FROM` | ❌ | Sender email address |
| `NODE_ENV` | ❌ | `production` or `development` (default: dev) |
| `PORT` | ❌ | Backend port (default: 5000) |

---

## License

ISC

## Features implemented
- JWT auth (register/login)
- Google OAuth (optional via env)
- Stripe Checkout (server + webhook)
- Real-time messaging with Socket.IO
- Email verification & password reset (SMTP optional)
- Dockerfiles + docker-compose
- Basic CI workflow

## Next
- Add GitHub Actions full test suite, e2e tests, and production hardening.
#   S k i l l S p h e r e  
 #   S k i l l S p h e r e  
 #   S k i l l S p h e r e  
 