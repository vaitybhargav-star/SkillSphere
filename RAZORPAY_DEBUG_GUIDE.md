# Razorpay Integration - Debug Guide

## Current Status ✅

- **Server**: Running on `http://localhost:5001`
- **Razorpay**: Initialized successfully with test credentials
- **MongoDB**: Connected and ready
- **Issue**: Connection refused on port 5000 + 500 errors when server is running

## Diagnosis

### Error 1: ERR_CONNECTION_REFUSED
- **Cause**: The backend server was not running on port 5000
- **Fix**: Server is now running on port 5001 (port 5000 was already in use)
- **Action**: Update your frontend API calls to use port 5001

### Error 2: 500 Internal Server Error
This could be caused by:

1. **Invalid Razorpay Credentials** (Most Likely)
   - Your .env has test credentials: `rzp_test_TEVWyZv5ovVU4X`
   - These might be invalid or expired
   - Razorpay API will reject them with a 400/401 error

2. **Missing User Authentication**
   - The endpoint requires authentication (`protect` middleware)
   - Missing JWT token will cause errors

3. **Invalid Request Body**
   - Missing `amount`, `gig`, or invalid `currency`

4. **Database Error**
   - MongoDB connection failure
   - Invalid user ID in JWT token

## How to Fix the Razorpay 500 Error

### Step 1: Update Your Frontend API URL
Change API calls from:
```javascript
// OLD - port 5000
fetch('http://localhost:5000/api/payments/razorpay/create-order', {
  method: 'POST',
  // ...
})

// NEW - port 5001
fetch('http://localhost:5001/api/payments/razorpay/create-order', {
  method: 'POST',
  // ...
})
```

### Step 2: Verify Razorpay Credentials
Option A: Use Valid Razorpay Test Credentials
1. Go to https://dashboard.razorpay.com/
2. Sign in to your account
3. Navigate to Settings → API Keys
4. Copy your Test Key ID and Test Key Secret
5. Update `.env`:
```env
RAZORPAY_KEY_ID=rzp_test_YOUR_ACTUAL_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_ACTUAL_KEY_SECRET
```
6. Restart the server: `npm start`

Option B: Disable Razorpay (Use Mock Provider)
1. Remove or comment out Razorpay credentials from `.env`
2. Use the mock checkout endpoint instead:
```javascript
fetch('http://localhost:5001/api/payments/checkout/mock', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ amount: 500, currency: 'USD', gig: 'gig-123' })
})
```

### Step 3: Test the Endpoint
With valid credentials, make a test request:

```bash
curl -X POST http://localhost:5001/api/payments/razorpay/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 500,
    "currency": "INR",
    "gig": "test-gig-123"
  }'
```

### Step 4: Check Server Logs
Monitor the server output for:
- ✅ `✅ Razorpay initialized with key:` - Credentials loaded
- 📝 `📝 Creating Razorpay order with options:` - Request received
- ✅ `✅ Razorpay order created:` - Success!
- ❌ `❌ Razorpay API Error:` - API rejection (check details)

## Improvements Made

I've updated the payment controller with better error handling:

1. **Enhanced Logging**: Now logs detailed error information
2. **Better Error Messages**: Returns specific error messages instead of generic ones
3. **Development Mode Stack Traces**: Includes stack traces in development mode
4. **Razorpay Initialization Logging**: Confirms if Razorpay is properly configured

## Common Razorpay Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Invalid key_id` | Wrong test credentials | Update .env with correct credentials |
| `Invalid key_secret` | Wrong test secret | Update .env with correct secret |
| `Invalid amount` | Amount < 0 or not a number | Ensure amount > 0 and is valid |
| `Invalid currency` | Unsupported currency code | Use valid ISO codes (INR, USD, etc.) |
| `Network timeout` | Razorpay API unreachable | Check internet connection |

## Next Steps

1. ✅ Update your frontend API URLs to use port 5001
2. ✅ Verify your Razorpay credentials in the dashboard
3. ✅ Test the endpoint with a valid request
4. ✅ Monitor server logs for detailed error messages
5. ✅ If errors persist, share the server log output for diagnosis

## Backend Server Logs Location
`c:\Users\Welcome\Desktop\SkillSphere\backend\server.log`

Check this file for detailed error messages if requests fail.
