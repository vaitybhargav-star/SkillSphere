# Razorpay Payment Testing Guide

## ✅ Current Status

- **Backend Server**: Running on `http://localhost:5000`
- **Razorpay Credentials**: ✅ Loaded (`rzp_test_TEVxVft9iUZXNR`)
- **Database**: ✅ Connected
- **Frontend API**: Points to `http://localhost:5000/api` (correct!)

---

## Common Causes of 500 Error

When you see `500 Internal Server Error` on the Razorpay payment endpoint, it's usually one of these:

| Cause | Error in Backend | Fix |
|-------|-------------------|-----|
| **Not logged in** | No JWT token sent | Log in first and get token |
| **Invalid JWT token** | Token signature mismatch | Log out and log in again |
| **User doesn't exist** | User ID from token not in DB | Create/recreate user account |
| **Missing payment data** | `amount`, `gig` not provided | Ensure form filled correctly |
| **Razorpay API failure** | Razorpay rejected the request | Check credentials, check amount |

---

## How to Test Properly

### Step 1: Ensure You're Logged In

The payment endpoint requires authentication. The frontend must:
1. Have a valid JWT token in `localStorage.token`
2. Send token in `Authorization: Bearer <token>` header

**Check in Browser Console:**
```javascript
console.log(localStorage.getItem('token'));
// Should print something like: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
// If empty/undefined, you need to log in first
```

### Step 2: Test with Valid Data

Make sure you're entering:
- **Gig ID**: A valid identifier (e.g., `gig-123` or `507f1f77bcf86cd799439011`)
- **Amount**: A valid number > 0 (e.g., `500`)
- **Currency**: `INR` (selected by default)

### Step 3: Monitor Backend Logs

Watch the server logs while making payment. You should see:

**For Success:**
```
📝 Creating Razorpay order with options: {...}
✅ Razorpay order created: order_IxxxxxxxxxxxJ
POST /api/payments/razorpay/create-order 200
```

**For 500 Error:**
```
❌ createRazorpayOrder Error: { message: "...", stack: "..." }
POST /api/payments/razorpay/create-order 500
```

---

## Debugging 500 Errors

### If You Get: "No user in request - auth may have failed"
**Problem**: JWT token is invalid or missing
**Solution**:
1. Log out of the application
2. Clear localStorage: 
   ```javascript
   localStorage.clear()
   ```
3. Refresh the page
4. Log in again with valid credentials

### If You Get: "Invalid or expired token"
**Problem**: JWT token signature doesn't match
**Solution**:
1. Check your `.env` - verify `JWT_SECRET` hasn't changed
2. Log in again to get a fresh token
3. Restart the backend: `npm start`

### If You Get: "User not found"
**Problem**: User ID in JWT doesn't exist in database
**Solution**:
1. The user account may have been deleted
2. Try creating a new account or using a different user
3. Check MongoDB directly (optional):
   ```bash
   # In a MongoDB shell
   use SkillSphere
   db.users.findOne({email: "your-email@example.com"})
   ```

### If You Get: "Amount must be greater than zero"
**Problem**: You didn't enter an amount or entered invalid value
**Solution**:
1. Ensure "Amount" field is filled with a number
2. Amount must be > 0
3. Amount should be a valid number (not text like "abc")

### If You Get: "Razorpay API Error: ..."
**Problem**: Razorpay API rejected your request
**Solution**:
1. Check your credentials in `.env`:
   ```env
   RAZORPAY_KEY_ID=rzp_test_TEVxVft9iUZXNR
   RAZORPAY_KEY_SECRET=r1bO6rPWIpcdeugMck7FISz5
   ```
2. Verify these match your Razorpay account
3. Go to https://dashboard.razorpay.com/ → Settings → API Keys
4. If different, update `.env` and restart: `npm start`

---

## Step-by-Step Testing Flow

### Test 1: Check Razorpay Config
```bash
curl http://localhost:5000/api/config
```

Expected response:
```json
{
  "success": true,
  "config": {
    "razorpayConfigured": true,  // Should be true
    "stripeConfigured": true,
    "googleConfigured": true
  }
}
```

### Test 2: Create Payment via Frontend

1. **Go to Payments page** (`http://localhost:5173/payments`)
2. **Log in as a client** (if not already)
3. **Select Razorpay** as payment provider
4. **Fill in form**:
   - Gig ID: `test-gig-123`
   - Amount: `500`
5. **Click "Pay with Razorpay"**

Watch the browser console (F12 → Console):
- Should show: `Order created: order_I...`
- Razorpay popup should appear

### Test 3: Simulate Payment (Browser DevTools)

If you want to test without real Razorpay account:

1. Open Browser Console (F12)
2. Check if error is logged there
3. Look for specific error message
4. Check Backend logs simultaneously for more details

---

## Frontend Integration Checklist

- [ ] User is logged in (check `localStorage.token`)
- [ ] JWT token exists and is valid
- [ ] Form is filled with valid data (gig ID and amount)
- [ ] Razorpay is enabled in config (`razorpayConfigured === true`)
- [ ] Backend server is running on port 5000
- [ ] Frontend API points to `http://localhost:5000/api`

---

## Backend Environment Checklist

- [ ] `.env` file has valid Razorpay credentials
- [ ] `RAZORPAY_KEY_ID` = `rzp_test_TEVxVft9iUZXNR`
- [ ] `RAZORPAY_KEY_SECRET` = `r1bO6rPWIpcdeugMck7FISz5`
- [ ] MongoDB is connected
- [ ] Server logs show `✅ Razorpay initialized`
- [ ] Port 5000 is available and server is running

---

## Useful Commands

**Check if server is running:**
```bash
netstat -ano | findstr :5000
```

**View server logs:**
```bash
cat backend\server.log
```

**Restart server:**
```bash
npm start  # in backend directory
```

**Clear frontend local storage:**
```javascript
// In browser console
localStorage.clear()
```

**Check JWT token:**
```javascript
// In browser console
console.log(JSON.parse(localStorage.getItem('user')))
console.log(localStorage.getItem('token'))
```

---

## Next Steps

1. **Try making a payment** from the frontend
2. **Watch the backend logs** for detailed error messages
3. **Share any error messages** you see in:
   - Browser console (F12 → Console)
   - Backend server output
   - Network tab (F12 → Network)

The improved error logging will now show you exactly what's happening and why payments are failing.

---

## Still Having Issues?

If you're still getting 500 errors:

1. **Check backend logs** - Look for `❌ createRazorpayOrder Error:`
2. **Note the exact error message**
3. **Verify you're logged in** - Check `localStorage.token`
4. **Try test payment mode** - Switch to "Test Payment" provider
5. **Restart both frontend and backend**

The test payment mode doesn't require Razorpay credentials and can help isolate if the issue is auth-related or Razorpay-specific.
