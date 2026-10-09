# Admin Dashboard Setup Guide

## ✅ Admin User Created

Your admin account is ready to use!

### Admin Login Credentials
- **Email:** `admin@skillsphere.com`
- **Password:** `Admin@123456`
- **Role:** Admin
- **Status:** Active

---

## 🚀 How to Access Admin Dashboard

### Step 1: Start the Backend
```bash
cd backend
npm install  # if not already done
npm run start
```
The backend will run on `http://localhost:5000`

### Step 2: Start the Frontend
```bash
cd frontend
npm install  # if not already done
npm run dev
```
The frontend will typically run on `http://localhost:5173`

### Step 3: Login as Admin
1. Navigate to the frontend (e.g., http://localhost:5173)
2. Click on **Login**
3. Enter credentials:
   - Email: `admin@skillsphere.com`
   - Password: `Admin@123456`
4. Click **Login**

### Step 4: Access Admin Dashboard
Once logged in, navigate to `/admin` or click the Admin Dashboard link.

---

## 📊 Admin Dashboard Features

The admin dashboard provides complete control over the platform:

### 1. **Overview Tab**
- **Total Users**: Total registered users on the platform
- **Freelancers**: Count of freelancer accounts
- **Active Gigs**: Number of open/available gigs
- **Completed Work**: Number of accepted/completed proposals
- **Platform Revenue**: 10% commission from completed transactions
- **Quick Actions**: Shortcut buttons to review gigs and check fraud

### 2. **Users Tab**
Manage all users on the platform:
- **View all users** with their details (name, email, role, status)
- **Suspend/Activate accounts** to control user access
- **Verify freelancers** to give them the verification badge
- Filter by role (Client, Freelancer)

**Actions:**
- `Suspend` - Temporarily disable a user account
- `Activate` - Re-enable a suspended account
- `Verify` - Award verification badge to freelancers (shows trust badge)

### 3. **Gigs Tab** (Gig Approval)
Review and approve/reject submitted gigs:
- **View pending gigs** waiting for approval
- **Review gig details** - title, description, budget, skills, milestones
- **Approve** - Make gig live on the platform
- **Reject** - Send back for revision with reason

Navigate to: `/admin-gig-approval` for detailed gig management interface

**Statistics:**
- Pending gigs count
- Approved gigs count
- Rejected gigs count

### 4. **Fraud Tab**
Detect and monitor suspicious activities:
- **Suspicious Spammers**: Users submitting excessive proposals (>50/day)
- **Review Manipulation**: Accounts receiving suspicious perfect 5-star reviews (20+/week)
- **Detailed view** of suspicious accounts with their activity metrics

**Use cases:**
- Identify bot-generated proposals
- Catch review manipulation schemes
- Block malicious users before they damage platform trust

### 5. **Payments Tab**
Monitor payment transactions and escrow:
- **Total Payments**: Count of successful payments
- **Total Amount**: Sum of all payments received
- **Platform Revenue**: 10% commission earned
- **Escrow Analytics**: 
  - Held escrow (in progress)
  - Released escrow (completed)
  - Disputed escrow (under resolution)
  - Refunded escrow (cancelled)

### 6. **Jobs Tab**
Monitor background jobs and trending skills:
- **Trending Skills**: Most in-demand skills on the platform
- **Scheduler Runs**: History of background job executions
- **Manual Triggers**: 
  - `Run Embeddings Now` - Refresh search embeddings
  - `Run Trending Now` - Recalculate trending skills
  - `Refresh View` - Reload job history

### 7. **Analytics (Built into Overview)**
Key metrics available:
- **Platform Revenue**: Monthly breakdown available
- **Active Freelancers**: Count in overview
- **Top Categories**: Most popular gig categories
- **Job Success Rate**: Percentage of accepted vs total proposals

---

## 🔧 Admin API Endpoints

All endpoints require admin authentication token.

### User Management
```
GET  /api/admin/users                    - Get all users
PUT  /api/admin/users/:id/toggle-status  - Suspend/activate user
PUT  /api/admin/users/:id/verify         - Verify freelancer
```

### Gig Approval
```
GET  /api/admin/gigs/pending             - Get pending gigs
POST /api/admin/gigs/:id/approve         - Approve gig
POST /api/admin/gigs/:id/reject          - Reject gig
GET  /api/admin/gigs/stats               - Get gig statistics
```

### Analytics
```
GET  /api/admin/stats                    - Platform statistics
GET  /api/admin/payments/analytics       - Payment analytics
GET  /api/admin/fraud/detect             - Fraud detection
GET  /api/admin/analytics/top-categories - Top gig categories
GET  /api/admin/analytics/job-success    - Job success rates
GET  /api/admin/dashboard                - Comprehensive dashboard
```

### Jobs & Trending
```
GET  /api/admin/trending-skills          - Trending skills
GET  /api/admin/jobs/runs                - Scheduler run history
POST /api/admin/jobs/run-embeddings      - Trigger embeddings refresh
POST /api/admin/jobs/run-trending        - Trigger trending computation
```

---

## 🔐 Security Notes

⚠️ **Important:**
- Keep your admin credentials secure
- Change the default password in production
- Use strong, unique passwords
- Enable 2FA when available
- Audit admin actions regularly

---

## 📝 Common Admin Tasks

### Approve a New Gig
1. Go to Admin Dashboard
2. Click "Gigs" tab or "Gig Approval Page"
3. Review pending gigs
4. Click "Review" on a gig
5. Click "Approve" and add optional notes
6. Client receives notification

### Suspend a Spamming User
1. Go to "Users" tab
2. Find the suspicious user
3. Click "Suspend" button
4. User account is disabled
5. Reactivate by clicking "Activate"

### Monitor Revenue
1. Check "Overview" tab for platform revenue
2. Go to "Payments" tab for detailed breakdown
3. Monitor escrow status to track fund flow

### Check Fraud Alerts
1. Go to "Fraud" tab
2. Review suspicious accounts
3. Cross-check with Users tab
4. Suspend if needed

---

## 🐛 Troubleshooting

### Issue: "Admin access required" error
- **Solution**: Ensure you're logged in as admin@skillsphere.com
- Check that your account role is "admin"

### Issue: Dashboard shows no data
- **Solution**: Make sure backend is running and connected to MongoDB
- Check browser console for API errors
- Try refreshing the page

### Issue: Can't login
- **Solution**: Verify email and password are correct
- Check that admin user exists: `db.users.findOne({email: "admin@skillsphere.com"})`

### Issue: Gigs not showing for approval
- **Solution**: Ensure gigs have been created with `approvalStatus: "pending"`
- Check Gig model to verify approval workflow

---

## 📚 Additional Resources

- Frontend Admin Component: `/frontend/src/pages/Admin.jsx`
- Backend Admin Controller: `/backend/controllers/adminController.js`
- Admin Routes: `/backend/routes/adminRoutes.js`
- Create More Admins: `node backend/scripts/createAdmin.js` (or modify email)

---

**Happy Admin-ing! 🎉**
