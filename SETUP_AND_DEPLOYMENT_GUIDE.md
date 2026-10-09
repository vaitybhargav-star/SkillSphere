# SkillSphere - Complete Setup & Configuration Guide

## 🚀 Quick Start (5 minutes)

### **Prerequisites**
- Node.js 18+ and npm
- MongoDB Atlas account (free tier available)
- Git

### **Local Development Setup**

```bash
# 1. Clone repository (if not already done)
cd SkillSphere

# 2. Install backend dependencies
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration

# 3. Install frontend dependencies
cd ../frontend
npm install
cp .env.example .env
# Edit .env with your configuration

# 4. Start backend (Terminal 1)
cd backend
npm start

# 5. Start frontend (Terminal 2)
cd frontend
npm run dev

# 6. Access application
# Frontend: http://localhost:5173
# Backend: http://localhost:5000
```

---

## 📦 Environment Variables Configuration

### **Backend (.env)**

```env
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/SkillSphere?retryWrites=true&w=majority

# Authentication
JWT_SECRET=your-super-secret-jwt-key-must-be-at-least-32-characters-long
JWT_EXPIRE=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Email (SMTP)
SMTP_SERVICE=gmail
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=noreply@skillsphere.com

# Payment (Stripe)
STRIPE_SECRET=sk_test_your-stripe-secret-key
STRIPE_PUBLIC=pk_test_your-stripe-public-key

# Payment (Razorpay)
RAZORPAY_KEY_ID=rzp_test_your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret

# File Upload (Cloudinary)
CLOUDINARY_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Server
PORT=5000
NODE_ENV=development

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379

# Optional: Huggingface AI
HUGGINGFACE_API_KEY=your-huggingface-api-key
```

### **Frontend (.env)**

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🔑 Get API Credentials

### **1. MongoDB Atlas**
```
1. Visit https://www.mongodb.com/cloud/atlas
2. Create account & free cluster
3. Create database user
4. Copy connection string
5. Replace in MONGO_URI
```

### **2. Google OAuth**
```
1. Visit https://console.cloud.google.com
2. Create new project
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI:
   - http://localhost:5000/api/auth/google/callback
   - https://yourdomain.com/api/auth/google/callback (production)
```

### **3. Stripe**
```
1. Visit https://dashboard.stripe.com/register
2. Create account
3. Copy test API keys
4. Activate live keys for production
```

### **4. Cloudinary**
```
1. Visit https://cloudinary.com/users/register/free
2. Create account
3. Get API credentials from dashboard
```

### **5. Gmail App Password** (for SMTP)
```
1. Enable 2FA on Google Account
2. Visit myaccount.google.com/apppasswords
3. Select Mail & Windows
4. Generate 16-character password
5. Use as SMTP_PASS
```

---

## ✅ Verification Steps

### **Backend Verification**
```bash
# Test API is running
curl http://localhost:5000/api/health

# Expected response:
# {"success":true,"message":"Server is running"}

# Test MongoDB connection
curl http://localhost:5000/api/auth/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","fullName":"Test User","role":"client"}'

# Should return user object with JWT token
```

### **Frontend Verification**
```
1. Navigate to http://localhost:5173
2. See login page
3. Click "Register" and create account
4. Should receive verification email (check spam folder)
5. Verify email
6. Login and see dashboard
```

### **Real-Time Features Verification**
```
1. Open browser console
2. Navigate to chat page
3. Should see Socket.IO connection in Network tab
4. Message should be delivered in real-time
5. Notifications should appear instantly
```

---

## 🔧 Database Setup

### **Initialize Database Indexes** (Automatic on server start)
```javascript
// Or manually run:
node backend/config/initializeIndexes.js
```

### **Seed Sample Data** (Optional)
```bash
node backend/scripts/seedData.js
```

### **Backup Database**
```bash
mongodump --uri "mongodb+srv://user:pass@cluster.mongodb.net" --out backup/
```

### **Restore Database**
```bash
mongorestore --uri "mongodb+srv://user:pass@cluster.mongodb.net" backup/
```

---

## 🌐 Deployment Guides

### **Deploy Backend to Heroku**

```bash
# 1. Install Heroku CLI
# Download from https://devcenter.heroku.com/articles/heroku-cli

# 2. Login to Heroku
heroku login

# 3. Create Heroku app
heroku create skillsphere-api

# 4. Set environment variables
heroku config:set JWT_SECRET="your-secret"
heroku config:set MONGO_URI="your-mongodb-uri"
heroku config:set STRIPE_SECRET="your-key"
# ... all other variables

# 5. Deploy
git push heroku main

# 6. View logs
heroku logs --tail

# 7. Add custom domain (optional)
heroku domains:add api.skillsphere.com
```

### **Deploy Frontend to Vercel**

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Set environment variables in Vercel dashboard
# Add VITE_API_URL pointing to your backend

# 4. Access at https://skillsphere.vercel.app
```

### **Deploy to DigitalOcean App Platform**

```bash
# 1. Create app.yaml
# [See template below]

# 2. Deploy
doctl apps create --spec app.yaml

# 3. Monitor
doctl apps describe <app-id>
```

**app.yaml template:**
```yaml
name: skillsphere
services:
  - name: backend
    github:
      repo: username/skillsphere
      branch: main
    build_command: cd backend && npm install && npm run build
    run_command: cd backend && npm start
    http_port: 5000
    envs:
      - key: MONGO_URI
        value: ${{ secrets.MONGO_URI }}
      - key: JWT_SECRET
        value: ${{ secrets.JWT_SECRET }}

  - name: frontend
    github:
      repo: username/skillsphere
      branch: main
    build_command: cd frontend && npm install && npm run build
    run_command: cd frontend && npm run preview
    http_port: 5173
```

---

## 🧪 Testing

### **Run Unit Tests**
```bash
cd backend
npm test

# Expected: All tests pass
# ✓ Auth tests
# ✓ Profile tests
```

### **Run E2E Tests** (if configured)
```bash
npm run test:e2e
```

### **Manual Test Checklist**

```
Authentication:
☐ Register new user
☐ Verify email
☐ Login
☐ JWT token generated
☐ 2FA setup
☐ Password reset

Marketplace:
☐ Create gig (as Client)
☐ Search for gigs (as Freelancer)
☐ Submit proposal
☐ Client accepts proposal
☐ Milestone update
☐ Complete project
☐ Leave review

Payments:
☐ Initiate payment
☐ Stripe checkout opens
☐ Payment confirmation
☐ Payout to freelancer

Admin:
☐ View all users
☐ Suspend user
☐ Verify freelancer
☐ View analytics
☐ Detect fraud
☐ Resolve dispute

Real-Time:
☐ Send message
☐ Receive notification
☐ Typing indicator
☐ Read receipt
```

---

## 🐛 Common Issues & Solutions

### **Issue: Port already in use**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

### **Issue: MongoDB connection refused**
```bash
# Check connection string
echo $MONGO_URI

# Verify IP whitelist in MongoDB Atlas
# Add your IP: https://cloud.mongodb.com/v2/<projectId>#/security/network
```

### **Issue: Email not sending**
```bash
# Verify SMTP credentials
# Enable 3rd-party apps in Gmail settings
# Check spam folder
# View logs: npm start | grep -i email
```

### **Issue: Stripe webhook not working**
```bash
# Use Stripe CLI for local testing:
stripe listen --forward-to localhost:5000/api/payments/webhook

# Copy webhook signing secret to .env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### **Issue: CORS error on frontend**
```
Add to backend app.js:
const cors = require('cors');
app.use(cors({
  origin: ['http://localhost:5173', 'https://yourdomain.com'],
  credentials: true
}));
```

### **Issue: Socket.IO connection failing**
```
Verify:
1. Backend CORS configured for Socket.IO
2. Frontend VITE_SOCKET_URL correct
3. No firewall blocking WebSocket
4. Check browser console for specific error
```

---

## 📊 Monitoring & Logs

### **View Backend Logs**
```bash
# Development
npm start

# Production with PM2
pm2 logs skillsphere-api

# View specific log file
tail -f logs/app.log
```

### **Database Performance**
```
MongoDB Atlas Dashboard:
1. Go to https://cloud.mongodb.com
2. Click "Metrics" tab
3. Monitor:
   - Query Performance
   - CPU usage
   - Memory usage
   - Network I/O
```

### **Frontend Performance**
```
Browser DevTools:
1. Open Chrome DevTools (F12)
2. Performance tab
3. Network tab for API calls
4. Console for errors
```

---

## 🔒 Security Checklist

### **Before Production**
- [ ] Change all default credentials
- [ ] Enable HTTPS/SSL certificate
- [ ] Set secure JWT secret (32+ characters)
- [ ] Enable MongoDB encryption
- [ ] Configure rate limiting
- [ ] Setup CORS properly
- [ ] Enable 2FA for admin
- [ ] Setup backup strategy
- [ ] Configure error logging
- [ ] Enable security headers

### **Environment Variables**
- [ ] Never commit .env file
- [ ] Use different secrets for dev/prod
- [ ] Rotate secrets periodically
- [ ] Use environment variable management service

### **API Security**
- [ ] Validate all inputs
- [ ] Sanitize outputs
- [ ] Use parameterized queries
- [ ] Implement rate limiting
- [ ] Add request timeout
- [ ] Log all API calls

---

## 📈 Performance Optimization

### **Database Optimization**
```bash
# Enable compression
MONGO_URI=mongodb+srv://...&compressors=snappy

# Connection pooling
maxPoolSize=50
```

### **Caching Strategy**
```bash
# Install Redis
npm install redis

# Use in controllers
const redis = require('redis');
const client = redis.createClient();

// Cache search results
const key = `search:${query}`;
const cached = await client.get(key);
if (cached) return JSON.parse(cached);
```

### **Frontend Optimization**
```bash
# Install dependencies for optimization
npm install @vitejs/plugin-react-swc
npm install compression

# Enable lazy loading
import { lazy, Suspense } from 'react';

const Analytics = lazy(() => import('./pages/Analytics'));
```

---

## 📞 Support Resources

### **Documentation**
- API Docs: See PROFESSIONAL_IMPLEMENTATION_GUIDE.md
- Frontend Components: frontend/src/components/README.md
- Database Schema: backend/models/README.md

### **External Resources**
- MongoDB: https://docs.mongodb.com
- Express: https://expressjs.com
- React: https://react.dev
- Socket.IO: https://socket.io
- Stripe: https://stripe.com/docs
- Heroku: https://devcenter.heroku.com

### **Community**
- GitHub Issues: Create issue for bugs
- Discussions: Share feedback
- Email: support@skillsphere.com

---

## 🎉 Next Steps

1. **Complete setup** using this guide
2. **Verify all components** work locally
3. **Run test suite** to ensure stability
4. **Deploy to staging** for team review
5. **Load test** with multiple users
6. **Deploy to production** with monitoring
7. **Monitor for 24hrs** for any issues
8. **Scale as needed** based on usage

---

**Version:** 2.0 | **Last Updated:** 2024

