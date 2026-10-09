# Frontend Integration Guide - New Features

## 🚀 Complete Integration Steps

This guide walks you through integrating all 8 new React components into your SkillSphere frontend.

---

## Step 1: Update Routing

Add new routes to your `frontend/src/routes/index.jsx`:

```jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

// New component imports
import { RecommendedFreelancers } from '../components/RecommendedFreelancers';
import { RecommendedGigs } from '../components/RecommendedGigs';
import { TrendingSkills } from '../components/TrendingSkills';
import { AvailabilitySetup } from '../components/AvailabilitySetup';
import { ProjectProgressTracker } from '../components/ProjectProgressTracker';
import { FreelancerAnalyticsDashboard } from '../components/FreelancerAnalyticsDashboard';
import { EnhancedReviewForm } from '../components/EnhancedReviewForm';
import { ReputationScore } from '../components/ReputationScore';

// New pages for new features
import MarketplacePage from '../pages/MarketplacePage';
import ProjectPage from '../pages/ProjectPage';
import AnalyticsPage from '../pages/AnalyticsPage';
import SettingsPage from '../pages/SettingsPage';
import UserProfilePage from '../pages/UserProfilePage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* ... existing routes ... */}

      {/* New Feature Routes */}
      <Route path="/marketplace" element={<MarketplacePage />} />
      <Route path="/project/:projectId" element={<ProtectedRoute><ProjectPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/settings/availability" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/profile/:userId" element={<UserProfilePage />} />
    </Routes>
  );
}
```

---

## Step 2: Create New Pages

### `frontend/src/pages/MarketplacePage.jsx`

```jsx
import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { RecommendedGigs } from '../components/RecommendedGigs';
import { TrendingSkills } from '../components/TrendingSkills';

export default function MarketplacePage() {
  const { user } = useContext(AuthContext);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Sign in to see recommended gigs</h1>
          <a href="/login" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Trending Skills Section */}
        <section>
          <TrendingSkills />
        </section>

        {/* Recommended Gigs Section */}
        <section>
          <RecommendedGigs freelancerId={user._id} />
        </section>
      </div>
    </div>
  );
}
```

### `frontend/src/pages/ProjectPage.jsx`

```jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { ProjectProgressTracker } from '../components/ProjectProgressTracker';

export default function ProjectPage() {
  const { projectId } = useParams();

  if (!projectId) {
    return <div className="text-red-600">Project not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <ProjectProgressTracker projectId={projectId} />
      </div>
    </div>
  );
}
```

### `frontend/src/pages/AnalyticsPage.jsx`

```jsx
import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { FreelancerAnalyticsDashboard } from '../components/FreelancerAnalyticsDashboard';

export default function AnalyticsPage() {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <div className="text-red-600">Not authenticated</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <FreelancerAnalyticsDashboard freelancerId={user._id} />
      </div>
    </div>
  );
}
```

### `frontend/src/pages/SettingsPage.jsx`

```jsx
import React from 'react';
import { AvailabilitySetup } from '../components/AvailabilitySetup';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <AvailabilitySetup />
      </div>
    </div>
  );
}
```

### `frontend/src/pages/UserProfilePage.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { ReputationScore } from '../components/ReputationScore';

export default function UserProfilePage() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchUser = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/user/${userId}`);
        setUser(response.data.data);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <div className="text-red-600">User not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* User Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-6">
            {user.profileImage && (
              <img
                src={user.profileImage}
                alt={user.fullName}
                className="w-24 h-24 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{user.fullName}</h1>
              <p className="text-gray-600">{user.email}</p>
              {user.location && (
                <p className="text-gray-600 mt-1">📍 {user.location.city}, {user.location.country}</p>
              )}
            </div>
          </div>
        </div>

        {/* Reputation Score */}
        <ReputationScore userId={userId} />

        {/* Additional user info */}
        {user.bio && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">About</h2>
            <p className="text-gray-700">{user.bio}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Step 3: Update Navigation/Navbar

Update `frontend/src/components/Navbar.jsx`:

```jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-blue-600">
          SkillSphere
        </Link>

        {user ? (
          <div className="flex items-center gap-6">
            {/* New navigation links */}
            <Link to="/marketplace" className="text-gray-700 hover:text-blue-600">
              Marketplace
            </Link>
            <Link to="/analytics" className="text-gray-700 hover:text-blue-600">
              Analytics
            </Link>
            <Link to="/settings/availability" className="text-gray-700 hover:text-blue-600">
              Settings
            </Link>

            {/* User menu */}
            <div className="flex items-center gap-3">
              <span className="text-gray-700">{user.fullName}</span>
              <Link to={`/profile/${user._id}`} className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center">
                {user.fullName.charAt(0)}
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-4">
            <Link to="/login" className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">
              Login
            </Link>
            <Link to="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
```

---

## Step 4: Update Context (if needed)

Ensure your `AuthContext` provides user data:

```jsx
// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and load user
      const loadUser = async () => {
        try {
          const response = await fetch('http://localhost:5000/api/user/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          if (data.success) {
            setUser(data.data);
          }
        } catch (error) {
          console.error('Failed to load user:', error);
        } finally {
          setLoading(false);
        }
      };
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## Step 5: Update Main App Layout

Update `frontend/src/App.jsx`:

```jsx
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import AppRoutes from './routes';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
```

---

## Step 6: Install Dependencies (if missing)

Make sure you have all required packages:

```bash
cd frontend
npm install axios
npm install tailwindcss
npm install react-router-dom
```

---

## Step 7: Update Tailwind Config

Ensure `frontend/tailwind.config.js` is properly configured:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

---

## Step 8: Test All Components

### Manual Testing Checklist

- [ ] **Marketplace Page**
  - [ ] Trending Skills loads without errors
  - [ ] Recommended Gigs loads for logged-in user
  - [ ] Can adjust limit selector
  - [ ] Responsive on mobile/tablet/desktop

- [ ] **Project Page**
  - [ ] Progress bar displays correctly
  - [ ] Can switch between tabs
  - [ ] Can add progress logs
  - [ ] Milestones display properly
  - [ ] Deliverables can be submitted

- [ ] **Analytics Page**
  - [ ] Dashboard loads and displays data
  - [ ] Quick stats cards show correct numbers
  - [ ] All 5 tabs work (Overview, Earnings, Proposals, Reviews, Projects)
  - [ ] Charts and visualizations render correctly

- [ ] **Settings Page**
  - [ ] Availability slots display
  - [ ] Can edit times
  - [ ] Timezone selection works
  - [ ] Save button submits data
  - [ ] Success message appears

- [ ] **User Profile Page**
  - [ ] User info displays
  - [ ] Reputation score shows
  - [ ] Trust level badge displays
  - [ ] Recent reviews list works

---

## Step 9: Deploy

Once tested locally:

```bash
# Build for production
cd frontend
npm run build

# Deploy dist folder to your hosting
```

---

## 🐛 Troubleshooting

### Components not loading
- Check that backend API is running on `http://localhost:5000`
- Verify JWT token is in localStorage
- Check browser console for errors

### Styling issues
- Ensure TailwindCSS is properly configured
- Clear cache: `npm run build && npm start`

### API errors
- Verify backend endpoints match component expectations
- Check CORS is enabled on backend
- Verify authentication tokens are valid

---

## 📊 File Structure After Integration

```
frontend/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx (updated)
│   │   ├── RecommendedFreelancers.jsx (new)
│   │   ├── RecommendedGigs.jsx (new)
│   │   ├── TrendingSkills.jsx (new)
│   │   ├── AvailabilitySetup.jsx (new)
│   │   ├── ProjectProgressTracker.jsx (new)
│   │   ├── FreelancerAnalyticsDashboard.jsx (new)
│   │   ├── EnhancedReviewForm.jsx (new)
│   │   ├── ReputationScore.jsx (new)
│   │   └── NewFeaturesIndex.js (new)
│   ├── pages/
│   │   ├── MarketplacePage.jsx (new)
│   │   ├── ProjectPage.jsx (new)
│   │   ├── AnalyticsPage.jsx (new)
│   │   ├── SettingsPage.jsx (new)
│   │   ├── UserProfilePage.jsx (new)
│   │   └── ... (existing pages)
│   ├── context/
│   │   ├── AuthContext.jsx (updated)
│   │   └── ... (existing context)
│   ├── routes/
│   │   └── index.jsx (updated)
│   └── App.jsx (updated)
```

---

## ✅ Integration Complete!

All 8 components are now integrated into your application:

- ✅ AI-Powered Job Matching (3 components)
- ✅ Availability Scheduler (1 component)
- ✅ Project Progress Tracker (1 component)
- ✅ Freelancer Analytics Dashboard (1 component)
- ✅ Enhanced Reviews (2 components)

Your SkillSphere MVP is now feature-complete on the frontend!

---

**Last Updated:** 2026-07-11
**Status:** ✅ Ready for Testing
