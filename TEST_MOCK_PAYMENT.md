# Quick Test: Using Mock Payment Mode

## Why Test with Mock Payment?

Mock payment mode doesn't require Razorpay credentials, so it will help us determine if:
- ✅ Backend is working properly
- ✅ Authentication is valid
- ✅ Payment creation logic works
- ✅ Frontend-backend communication is correct

If mock payment works but Razorpay doesn't, then the issue is with Razorpay credentials, not the core payment system.

---

## Step 1: Go to Payments Page

Navigate to: `http://localhost:5173/payments`

---

## Step 2: Ensure You're Logged In

Check browser console:
```javascript
console.log(localStorage.getItem('token'))
// Should show a long JWT token, not null/undefined
```

---

## Step 3: Fill the Payment Form

1. **Gig ID**: Enter `test-gig-123`
2. **Amount**: Enter `500`
3. **Provider**: Select **"Test Payment"** (not Razorpay)

---

## Step 4: Click "Continue with Test Payment"

The button label should be "Continue with Test Payment"

---

## Step 5: Watch What Happens

### Expected Success:
```
✅ Payment completed successfully.
(Page redirects to /payments?status=success)
```

### If You Get Error:
```
❌ Error message displayed (check what it says)
```

---

## What This Tells Us

### If Mock Payment Works:
✅ Backend is functioning correctly
✅ Frontend-backend communication is good
✅ Authentication system is working
✅ **Issue is specifically with Razorpay credentials**

**Next Step**: Verify your Razorpay credentials

### If Mock Payment Also Fails:
❌ Issue is with the core payment system
❌ Could be authentication, database, or backend logic
❌ Need to check backend logs for specific error

**Next Step**: Check backend logs for error message

---

## Monitoring While Testing

### Open Browser DevTools (F12)

**Network Tab**:
1. Click "Network" tab
2. Look for POST request to `/api/payments/checkout/mock`
3. Check response status (should be 200)
4. Check response body for error or success

**Console Tab**:
1. Look for any error messages
2. Check for logged payment response

### Open Backend Terminal

Watch for logs like:
```
📝 Creating mock checkout...
✅ Mock checkout created successfully
POST /api/payments/checkout/mock 200
```

Or if error:
```
❌ Error creating mock checkout
POST /api/payments/checkout/mock 500
```

---

## Test Results

After running this test, please tell me:

1. **Did mock payment work?** (Yes/No)
2. **What error did you get?** (If failed)
3. **What does backend log show?** (Copy exact error)
4. **What does browser console show?** (Copy exact error)

This will help us determine if the issue is Razorpay-specific or system-wide.

---

## Why This Matters

The fact that the Razorpay endpoint is calling the backend successfully (we see 500 error) means:
- ✅ Frontend can reach backend
- ✅ Authentication middleware is responding
- ✅ Routing is correct

The 500 error is happening specifically in the Razorpay order creation, which means either:
1. Razorpay credentials are invalid
2. Razorpay API is rejecting the request
3. Razorpay is not responding

By testing mock payment, we can eliminate option 2 and 3.

---

## Quick Reference

**Mock Payment Endpoint**: `POST /api/payments/checkout/mock`
**Razorpay Endpoint**: `POST /api/payments/razorpay/create-order`

Both endpoints require:
- Valid JWT token in Authorization header
- Valid payment data (amount, gig ID)
- Authenticated user (client role)

The difference is:
- Mock: Creates payment immediately without calling Razorpay
- Razorpay: Calls Razorpay API to create an order first

Let me know the results!
