# 🗑️ Database Cleanup & Professional Seeding Guide

## The Problem
Your MongoDB contains test/dummy data with unprofessional names and emails like:
- "Auto Client Full"
- "testclient+auto40@example.com"
- Other test user data

## The Solution
I've created two professional scripts to clean up and seed your database with realistic data.

---

## 📋 Step-by-Step Instructions

### **Step 1: Cleanup All Test Data**

```bash
cd backend
npm run cleanup
```

**What it does:**
- ✅ Deletes all users with test-related emails (test, auto, demo, fake, sample, example.com)
- ✅ Deletes test gigs with test-related titles
- ✅ Removes orphaned proposals, reviews, and payments
- ✅ Cleans up your database completely

**Expected Output:**
```
✅ Connected to MongoDB
🗑️ Deleted test user: Auto Client Full (testclient+auto40@example.com)
🗑️ Deleted test user: Test User (test@example.com)
...
✅ Cleanup Complete!
🟢 Database cleanup finished successfully!
```

---

### **Step 2: Seed Professional Data**

```bash
cd backend
npm run seed:professional
```

**What it does:**
- ✅ Creates 3 professional client accounts
- ✅ Creates 4 professional freelancer accounts with verified badges
- ✅ Creates 4 professional gigs
- ✅ Creates sample reviews with real feedback

**Professional Data Created:**

#### **Clients:**
| Name | Email | Role |
|------|-------|------|
| Sarah Anderson | sarah.anderson@techcorp.com | Project Manager |
| Michael Chen | michael.chen@startups.io | CTO |
| Emma Rodriguez | emma.rodriguez@design.co | Design Director |

#### **Freelancers:**
| Name | Email | Skills | Hourly Rate |
|------|-------|--------|------------|
| James Mitchell | james.mitchell@freelance.dev | React, Node.js, MongoDB | $85/hr |
| Sofia Petrov | sofia.petrov@designer.com | Figma, UI/UX Design | $75/hr |
| David Kumar | david.kumar@marketing.pro | SEO, Content Marketing | $65/hr |
| Jessica Wang | jessica.wang@data.science | Python, Machine Learning | $95/hr |

#### **Gigs Posted:**
1. **E-commerce Platform Development** ($8,000)
2. **Mobile App UI/UX Design** ($4,500)
3. **SEO Optimization & Content Strategy** ($3,000)
4. **Machine Learning Model Development** ($6,000)

---

### **Step 3: Do Both at Once (Recommended)**

```bash
cd backend
npm run seed
```

This runs both cleanup and seeding in one command:
```bash
npm run cleanup && npm run seed:professional
```

---

## 🔐 Test Credentials

### **Client Accounts:**
```
Email: sarah.anderson@techcorp.com
Password: Secure@Pass123

Email: michael.chen@startups.io
Password: Secure@Pass123

Email: emma.rodriguez@design.co
Password: Secure@Pass123
```

### **Freelancer Accounts:**
```
Email: james.mitchell@freelance.dev
Password: Secure@Pass123
(Full-Stack Developer, $85/hr, 8 years experience)

Email: sofia.petrov@designer.com
Password: Secure@Pass123
(UI/UX Designer, $75/hr, 6 years experience)

Email: david.kumar@marketing.pro
Password: Secure@Pass123
(Marketing Strategist, $65/hr, 7 years experience)

Email: jessica.wang@data.science
Password: Secure@Pass123
(Data Scientist, $95/hr, 5 years experience)
```

---

## 📊 Professional Data Features

### **All Freelancers Have:**
✅ Verified email (isVerified: true)  
✅ Verification badge (verificationBadge: true)  
✅ Professional title  
✅ Years of experience  
✅ Hourly rate  
✅ Relevant skills list  
✅ Professional bio  

### **All Gigs Include:**
✅ Descriptive titles  
✅ Detailed descriptions  
✅ Realistic budgets  
✅ Relevant skills required  
✅ Milestone tracking  
✅ Open status  

### **All Reviews Are:**
✅ 5-star professional testimonials  
✅ Linked to real users  
✅ Dated (within last 30 days)  
✅ Realistic feedback  

---

## 🚀 Complete Setup Process

```bash
# 1. Ensure backend is configured
cd backend
cp .env.example .env

# 2. Clean and seed database
npm run seed

# 3. Start the backend
npm start

# 4. In another terminal, start frontend
cd frontend
npm run dev

# 5. Login with professional credentials
# Use any client or freelancer email from above
```

---

## ⚠️ Important Notes

### **Before Running:**
- ✅ Ensure MongoDB connection is configured in `.env`
- ✅ Make sure you want to delete all test data
- ✅ Backup important data if needed

### **After Running:**
- ✅ All test data is completely removed
- ✅ Database is fresh with professional sample data
- ✅ All credentials are valid for testing
- ✅ Gigs are ready to receive proposals

---

## 🔧 Customization

### **Want to Add More Data?**

Edit `backend/scripts/seedProfessionalData.js` and add to:

```javascript
// Add more clients
const clients = [
  {
    fullName: "Your Client Name",
    email: "client@email.com",
    // ... other fields
  },
  // ... more clients
];
```

Then run:
```bash
npm run seed:professional
```

---

## 🆘 Troubleshooting

### **Error: "Cannot find module"**
```bash
npm install
```

### **Error: "MongoDB connection failed"**
```
Check MONGO_URI in .env file
Verify MongoDB Atlas whitelist includes your IP
```

### **Script deletes too much data**
The cleanup script only deletes users/gigs with these keywords:
- test
- auto
- demo
- fake
- sample
- example.com

If you need to preserve something, rename it before running cleanup.

---

## ✅ Verification

After seeding, check MongoDB to verify:

```javascript
// In MongoDB Compass or Atlas, check collections:

Users Collection:
  - 3 clients with professional emails
  - 4 freelancers with verified badges
  - All have proper roles assigned

Gigs Collection:
  - 4 professional gigs
  - All open and ready for proposals
  - Proper skill requirements

Reviews Collection:
  - 3 professional reviews
  - Linked to real users
  - 5-star ratings
```

---

## 🎯 Next Steps

1. ✅ Run cleanup: `npm run cleanup`
2. ✅ Seed professional data: `npm run seed:professional`
3. ✅ Verify in MongoDB
4. ✅ Test login with professional credentials
5. ✅ Test proposing on gigs
6. ✅ Test reviews and ratings

---

**Status:** Your database is now professional and ready! 🎉

