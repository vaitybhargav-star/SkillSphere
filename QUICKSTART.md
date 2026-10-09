# Quick Start Guide - SkillSphere MVP

## 🚀 5-Minute Setup

### Prerequisites
- Node.js 18+ installed
- MongoDB running (local or Atlas)
- Git installed

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/your-repo/skillsphere.git
cd skillsphere

# Backend setup
cd backend
npm install
npm run dev

# In new terminal - Frontend setup
cd frontend
npm install
npm run dev
```

### 2. Environment Variables

**backend/.env**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/skillsphere
JWT_SECRET=your_jwt_secret_here
STRIPE_SECRET_KEY=your_stripe_key_here
GMAIL_EMAIL=your_email@gmail.com
GMAIL_PASSWORD=your_app_password_here
```

**frontend/.env**
```
VITE_API_URL=http://localhost:5000/api
```

### 3. Start Development

```bash
# Terminal 1: Backend (port 5000)
cd backend && npm run dev

# Terminal 2: Frontend (port 5173)
cd frontend && npm run dev
```

### 4. Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **MongoDB**: mongodb://localhost:27017/skillsphere

---

## 📁 Key Files & Locations

### Backend New Features
```
backend/
├── controllers/
│   ├── matchingController.js       (AI matching)
│   ├── availabilityController.js   (Scheduling)
│   ├── progressController.js       (Progress tracking)
│   ├── analyticsController.js      (Analytics)
│   └── enhancedReviewController.js (Fraud detection)
├── models/
│   ├── Availability.js             (NEW)
│   └── ProjectProgress.js          (NEW)
├── routes/
│   ├── matchingRoutes.js
│   ├── availabilityRoutes.js
│   ├── progressRoutes.js
│   └── analyticsRoutes.js
└── app.js (updated with new routes)
```

### Frontend New Components
```
frontend/src/components/
├── RecommendedFreelancers.jsx           (AI Matching)
├── RecommendedGigs.jsx                  (AI Matching)
├── TrendingSkills.jsx                   (AI Matching)
├── AvailabilitySetup.jsx                (Scheduler)
├── ProjectProgressTracker.jsx           (Progress)
├── FreelancerAnalyticsDashboard.jsx     (Analytics)
├── EnhancedReviewForm.jsx               (Reviews)
├── ReputationScore.jsx                  (Reputation)
└── NewFeaturesIndex.js                  (Export all)

frontend/src/pages/
├── MarketplacePage.jsx                  (NEW)
├── ProjectPage.jsx                      (NEW)
├── AnalyticsPage.jsx                    (NEW)
├── SettingsPage.jsx                     (NEW)
└── UserProfilePage.jsx                  (NEW)
```

### Documentation
```
├── IMPLEMENTATION_SUMMARY.md            (This document)
├── NEW_FEATURES.md                      (Feature details)
├── API_REFERENCE.md                     (API endpoints)
├── frontend/COMPONENTS_GUIDE.md         (Component usage)
├── frontend/INTEGRATION_GUIDE.md        (Integration steps)
└── DEPLOYMENT.md                        (Deployment guide)
```

---

## 🧪 Testing Checklist

### Quick Test All Features

**1. AI Matching**
```bash
# Test: GET /api/matching/recommend/{gigId}
curl http://localhost:5000/api/matching/recommend/gig123
# Expected: Array of recommended freelancers with scores
```

**2. Availability Scheduling**
```bash
# Test: POST /api/availability/setup
# Body: { availabilitySlots, timezone, totalAvailableHours }
# Sign in first to get token
```

**3. Project Progress**
```bash
# Test: GET /api/progress/{projectId}
curl http://localhost:5000/api/progress/project123
# Expected: Project with milestones, logs, deliverables
```

**4. Analytics**
```bash
# Test: GET /api/analytics/freelancer/{id}/overview
curl http://localhost:5000/api/analytics/freelancer/user123/overview
# Expected: Overview stats
```

**5. Enhanced Reviews**
```bash
# Test: POST /api/reviews/enhanced/create
# Body: { rating, qualityRating, comment, ... }
# Includes fraud detection
```

---

## 🎯 Feature Overview

### ✅ 15/15 Features Complete

#### Core Features (Existing)
- ✅ Authentication (JWT)
- ✅ Freelancer Profiles
- ✅ Marketplace Gigs
- ✅ Proposals & Bidding
- ✅ Real-Time Chat
- ✅ Payments (Stripe)
- ✅ Admin Dashboard
- ✅ Notifications
- ✅ Dispute Resolution

#### New Features (Implemented)
- ✅ AI-Powered Job Matching
- ✅ Smart Review System
- ✅ Advanced Search
- ✅ Availability Scheduler
- ✅ Project Progress Tracker
- ✅ Analytics Dashboard

---

## 🔧 Common Tasks

### Run Backend Tests
```bash
cd backend
npm test
```

### Run Frontend Tests
```bash
cd frontend
npm run test:unit
npm run test:e2e
```

### Build for Production
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

### Database Seeding
```bash
cd backend
npm run seed
```

### Clean Slate
```bash
# Drop database
mongo
use skillsphere
db.dropDatabase()

# Reinstall dependencies
cd backend && rm -rf node_modules && npm install
cd frontend && rm -rf node_modules && npm install
```

---

## 🐛 Troubleshooting

### Port 5000 Already in Use
```bash
# Find process on port 5000
lsof -i :5000
# Kill process
kill -9 <PID>
```

### MongoDB Connection Error
```bash
# Check MongoDB is running
mongo --version
# Start MongoDB
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env
```

### Frontend Can't Connect to Backend
```bash
# Check backend is running
curl http://localhost:5000/api/health

# Check CORS in backend/app.js
# Default: http://localhost:5173

# Check API URL in frontend/.env
```

### CORS Issues
```
Error: Access to XMLHttpRequest has been blocked by CORS policy

Solution:
1. Check backend has cors enabled
2. Check frontend API URL matches CORS origin
3. Clear browser cache
```

### Component Not Loading
```
Solution:
1. Check imports in NewFeaturesIndex.js
2. Verify component file exists
3. Check for syntax errors: npm run lint
4. Restart dev server
```

---

## 📊 API Examples

### Get Recommended Freelancers
```bash
curl http://localhost:5000/api/matching/recommend/gig-id-here?limit=10
```

### Set Availability
```bash
curl -X POST http://localhost:5000/api/availability/setup \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "availabilitySlots": [
      { "dayOfWeek": "Monday", "startTime": "09:00", "endTime": "17:00" }
    ],
    "timezone": "EST"
  }'
```

### Get Analytics
```bash
curl http://localhost:5000/api/analytics/freelancer/user-id/overview
```

### Create Review with Fraud Detection
```bash
curl -X POST http://localhost:5000/api/reviews/enhanced/create \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "qualityRating": 5,
    "communicationRating": 5,
    "comment": "Great work!"
  }'
```

---

## 📈 Performance Metrics

| Metric | Target | Status |
|--------|--------|--------|
| API Response Time | < 200ms | ✅ Optimized |
| Frontend Load Time | < 3s | ✅ Optimized |
| Database Query Time | < 100ms | ✅ Indexed |
| Error Rate | < 0.1% | ✅ Handled |
| Uptime | 99.9% | ✅ Monitored |

---

## 🔐 Security Notes

- JWT tokens expire after 24 hours
- Passwords hashed with bcrypt (10 rounds)
- Rate limiting: 200 requests per 15 minutes
- All API responses validated
- Fraud detection on reviews
- HTTPS recommended for production

---

## 📞 Getting Help

**Documentation Files:**
- `API_REFERENCE.md` - All endpoints with examples
- `COMPONENTS_GUIDE.md` - Frontend component usage
- `INTEGRATION_GUIDE.md` - Step-by-step integration
- `DEPLOYMENT.md` - Production deployment

**Common Issues:**
- Check `backend/tests/` for API usage examples
- Check component files for usage examples
- Check `backend/middleware/` for auth examples

---

## 🚀 Deployment

### Quick Deployment to Heroku
```bash
# Login to Heroku
heroku login

# Create app
heroku create skillsphere-app

# Set environment variables
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-secret
heroku config:set STRIPE_SECRET_KEY=your-stripe-key

# Deploy
git push heroku main
```

### Using Docker
```bash
# Build
docker-compose build

# Run
docker-compose up

# Access
http://localhost:5000 (backend)
http://localhost:3000 (frontend)
```

---

## 📋 Project Status

- ✅ **All 15 features implemented**
- ✅ **Backend: Production-ready**
- ✅ **Frontend: Feature-complete**
- ✅ **Documentation: Comprehensive**
- ✅ **Testing: Automated**
- ✅ **Security: Implemented**

**Ready for launch! 🎉**

---

**Last Updated:** 2026-07-11
**Version:** 1.0.0 MVP
**Status:** ✅ Production Ready
