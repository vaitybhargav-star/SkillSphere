# SkillSphere API Endpoints - Complete Reference

## 🔍 AI-Powered Job Matching (`/api/matching`)

### Get Recommended Freelancers for a Gig
```
GET /api/matching/recommend/:gigId?limit=10
```
**Description:** Get AI-recommended freelancers for a specific gig based on skill match, rating, and experience.

**Response:**
```json
{
  "success": true,
  "data": {
    "gigId": "...",
    "gigTitle": "React Developer needed",
    "recommendedFreelancers": [
      {
        "freelancerId": "...",
        "name": "John Doe",
        "title": "Senior React Developer",
        "matchScore": "92.5",
        "skillMatch": "100",
        "hourlyRate": 50,
        "averageRating": "4.8",
        "hasApplied": false
      }
    ]
  }
}
```

### Get Recommended Gigs for a Freelancer
```
GET /api/matching/find-gigs/:freelancerId?limit=10
```
**Description:** Get gigs recommended for a specific freelancer based on their skills and pricing.

**Response:**
```json
{
  "success": true,
  "data": {
    "freelancerId": "...",
    "freelancerName": "Jane Smith",
    "recommendedGigs": [
      {
        "gigId": "...",
        "title": "Build E-commerce Site",
        "category": "Web Development",
        "budget": 3000,
        "matchScore": "87.3",
        "skillMatch": "95"
      }
    ]
  }
}
```

### Get Trending Skills
```
GET /api/matching/trending/skills
```
**Description:** Get trending skills across the platform with demand levels.

**Response:**
```json
{
  "success": true,
  "data": {
    "trendingSkills": [
      { "skill": "React", "count": 245, "demand": "High" },
      { "skill": "Node.js", "count": 198, "demand": "High" },
      { "skill": "Python", "count": 156, "demand": "Medium" }
    ]
  }
}
```

---

## 📅 Availability Scheduler (`/api/availability`)

### Setup Availability Schedule
```
POST /api/availability/setup
Authorization: Bearer <JWT_TOKEN>
```
**Body:**
```json
{
  "availabilitySlots": [
    {
      "dayOfWeek": "Monday",
      "startTime": "09:00",
      "endTime": "17:00",
      "hoursAvailable": 8
    }
  ],
  "timezone": "UTC",
  "totalAvailableHours": 40
}
```

### Get Freelancer's Availability
```
GET /api/availability/:freelancerId
```
**Response:**
```json
{
  "success": true,
  "data": {
    "freelancer": "...",
    "availabilitySlots": [...],
    "bookedSlots": [...],
    "totalAvailableHours": 40,
    "totalBookedHours": 24
  }
}
```

### Book a Freelancer
```
POST /api/availability/book
Authorization: Bearer <JWT_TOKEN>
```
**Body:**
```json
{
  "freelancerId": "...",
  "gigId": "...",
  "startDate": "2026-08-01",
  "endDate": "2026-08-14",
  "hoursPerDay": 4
}
```

### Add Calendar Event
```
POST /api/availability/add-event
Authorization: Bearer <JWT_TOKEN>
```
**Body:**
```json
{
  "date": "2026-08-15",
  "title": "Summer Vacation",
  "description": "Not available",
  "eventType": "unavailable"
}
```

### Check Freelancer Availability
```
GET /api/availability/check-availability?freelancerId=...&startDate=2026-08-01&endDate=2026-08-14
```
**Response:**
```json
{
  "success": true,
  "data": {
    "isAvailable": true,
    "conflicts": [],
    "availableHours": 16
  }
}
```

### Update Availability Status
```
PUT /api/availability/:availabilityId
Authorization: Bearer <JWT_TOKEN>
```
**Body:**
```json
{
  "status": "away"  // available, busy, away
}
```

---

## 📊 Project Progress Tracker (`/api/progress`)

### Create Progress Tracker
```
POST /api/progress/create
Authorization: Bearer <JWT_TOKEN>
```
**Body:**
```json
{
  "gigId": "...",
  "proposalId": "...",
  "milestones": [
    {
      "title": "Design Phase",
      "targetDate": "2026-08-15",
      "deliverables": ["Wireframes", "Design mockups"]
    }
  ],
  "projectStartDate": "2026-08-01",
  "projectDeadline": "2026-08-30"
}
```

### Get Project Progress
```
GET /api/progress/:projectId
```
**Response:**
```json
{
  "success": true,
  "data": {
    "projectId": "...",
    "overallCompletion": 45,
    "milestones": [...],
    "progressLogs": [...],
    "deliverables": [...]
  }
}
```

### Update Project Status
```
PUT /api/progress/:projectId/status
Authorization: Bearer <JWT_TOKEN>
```
**Body:**
```json
{
  "status": "in-progress"  // not-started, in-progress, on-hold, completed, cancelled
}
```

### Add Progress Log
```
POST /api/progress/:projectId/add-log
Authorization: Bearer <JWT_TOKEN>
```
**Body:**
```json
{
  "description": "Completed UI design",
  "percentageCompleted": 50,
  "filesUploaded": [
    {
      "filename": "design.xd",
      "url": "https://..."
    }
  ],
  "comments": "Feedback: add dark mode"
}
```

### Update Milestone
```
PUT /api/progress/:projectId/milestone/:milestoneIndex
Authorization: Bearer <JWT_TOKEN>
```
**Body:**
```json
{
  "completionPercentage": 100,
  "status": "completed",
  "deliverables": ["Wireframes", "Design mockups"]
}
```

### Submit Deliverable
```
POST /api/progress/:projectId/deliverable
Authorization: Bearer <JWT_TOKEN>
```
**Body:**
```json
{
  "title": "Final Design",
  "description": "Complete design mockups",
  "url": "https://..."
}
```

### Approve/Reject Deliverable
```
PUT /api/progress/:projectId/deliverable/:deliverableIndex
Authorization: Bearer <JWT_TOKEN>
```
**Body:**
```json
{
  "status": "approved"  // approved, rejected
}
```

### Report Issue
```
POST /api/progress/:projectId/issue
Authorization: Bearer <JWT_TOKEN>
```
**Body:**
```json
{
  "title": "Unclear Requirements",
  "description": "Need clarification on feature X",
  "severity": "high"  // low, medium, high
}
```

---

## 📈 Analytics Dashboard (`/api/analytics`)

### Get Freelancer Overview
```
GET /api/analytics/freelancer/:freelancerId/overview
```
**Response:**
```json
{
  "success": true,
  "data": {
    "freelancerId": "...",
    "stats": {
      "profileViews": 125,
      "totalProposals": 42,
      "acceptedProposals": 12,
      "totalProjects": 10,
      "completedProjects": 8,
      "averageRating": 4.8,
      "totalEarnings": 15000.00
    }
  }
}
```

### Get Earnings Analytics
```
GET /api/analytics/freelancer/:freelancerId/earnings?period=monthly
```
**Response:**
```json
{
  "success": true,
  "data": {
    "totalEarnings": 15000.00,
    "totalTransactions": 12,
    "earningsTimeline": [
      { "period": "2026-06", "amount": 2500, "transactionCount": 3 },
      { "period": "2026-07", "amount": 3200, "transactionCount": 4 }
    ]
  }
}
```

### Get Proposal Analytics
```
GET /api/analytics/freelancer/:freelancerId/proposals
```
**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total": 42,
      "pending": 5,
      "accepted": 12,
      "rejected": 25
    },
    "acceptanceRate": "28.6",
    "byCategory": [
      { "category": "Web Development", "count": 20, "accepted": 8 }
    ]
  }
}
```

### Get Review Analytics
```
GET /api/analytics/freelancer/:freelancerId/reviews
```
**Response:**
```json
{
  "success": true,
  "data": {
    "analytics": {
      "totalReviews": 15,
      "averageRating": 4.8,
      "ratingDistribution": { "5": 12, "4": 3, "3": 0, "2": 0, "1": 0 }
    }
  }
}
```

### Get Project Analytics
```
GET /api/analytics/freelancer/:freelancerId/projects
```
**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total": 10,
      "completed": 8,
      "inProgress": 1,
      "onHold": 1
    },
    "completionRate": "80",
    "averageCompletionTime": "14 days"
  }
}
```

### Get Full Dashboard
```
GET /api/analytics/freelancer/:freelancerId/full-dashboard
```
**Description:** Get all analytics combined into one complete dashboard.

---

## ⭐ Enhanced Reviews (`/api/reviews`)

### Create Review with Fraud Detection
```
POST /api/reviews/enhanced/create
Authorization: Bearer <JWT_TOKEN>
```
**Body:**
```json
{
  "gigId": "...",
  "revieweeId": "...",
  "rating": 5,
  "qualityRating": 5,
  "communicationRating": 5,
  "deadlineRating": 5,
  "professionalismRating": 5,
  "comment": "Excellent work! Very professional and delivered on time."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reviewId": "...",
    "rating": 5,
    "fraudCheck": {
      "flagged": false,
      "confidence": 0.15,
      "reasons": []
    }
  }
}
```

### Get User Reviews with Analytics
```
GET /api/reviews/enhanced/:userId
```
**Response:**
```json
{
  "success": true,
  "data": {
    "reviews": [...],
    "analytics": {
      "totalReviews": 15,
      "averageRating": 4.8,
      "distribution": { "5": 12, "4": 3, "3": 0, "2": 0, "1": 0 },
      "weightedScore": 4.85
    }
  }
}
```

### Report Review as Inappropriate
```
POST /api/reviews/:reviewId/report
Authorization: Bearer <JWT_TOKEN>
```
**Body:**
```json
{
  "reason": "Offensive language"
}
```

### Mark Review as Helpful
```
PUT /api/reviews/:reviewId/helpful
Authorization: Bearer <JWT_TOKEN>
```
**Body:**
```json
{
  "helpful": true
}
```

### Get Reputation Analytics
```
GET /api/reviews/analytics/reputation/:userId
```
**Response:**
```json
{
  "success": true,
  "data": {
    "reputationScore": 92.5,
    "trustLevel": "Top Rated",
    "reviewsCount": 15,
    "averageRating": 4.8
  }
}
```

---

## 📋 Additional Enhanced Gig Features

### Search Gigs with Geo-Location
```
GET /api/gigs/nearby?latitude=40.7128&longitude=-74.0060&radius=50&minRating=4
```

### Full-Text Search Gigs
```
GET /api/gigs/search?q=react developer
```

### Filter by Budget Range
```
GET /api/gigs?minBudget=1000&maxBudget=5000
```

### Filter by Experience Level
```
GET /api/gigs?requiredExperience=expert&skills=React,Node
```

---

## 📝 Notes

- All endpoints requiring authentication need `Authorization: Bearer <JWT_TOKEN>` header
- All timestamps are in ISO 8601 format
- All monetary amounts are in USD (or configured currency)
- Pagination available on list endpoints (default limit: 10, max: 100)
- Rate limiting: 200 requests per 15 minutes per IP

---

## 🔐 Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

**Last Updated:** 2026-07-11
**API Version:** 1.0.0
