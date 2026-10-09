# Razorpay Credentials Setup Guide

## Step 1: Get Your Real Razorpay Credentials

### For Test Environment (Recommended for Development):

1. **Create a Razorpay Account**
   - Go to: https://razorpay.com/
   - Click "Sign Up" or "Get Started"
   - Complete the registration process

2. **Access Your Dashboard**
   - Go to: https://dashboard.razorpay.com/
   - Sign in with your credentials
   - Click on your profile → Switch to "Test Mode" (if not already)

3. **Find Your API Keys**
   - In the left sidebar, go to **Settings → API Keys**
   - You'll see two sections: "Key ID" and "Key Secret"
   - Copy both values carefully

4. **Test Keys vs Live Keys**
   - **Test Keys**: Start with `rzp_test_` (Safe for development)
   - **Live Keys**: Start with `rzp_live_` (Use only in production)
   - Always use Test Keys during development

## Step 2: Update Your .env File

Open: `backend/.env`

Find these lines:
```env
RAZORPAY_KEY_ID=rzp_test_TEVWyZv5ovVU4X
RAZORPAY_KEY_SECRET=z7ijmwiL89LJ2pG8F65pwrDA
```

Replace with YOUR actual credentials:
```env
RAZORPAY_KEY_ID=rzp_test_YOUR_ACTUAL_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_ACTUAL_KEY_SECRET
```

⚠️ **IMPORTANT**: 
- Never commit real credentials to git (they're already in .env which should be in .gitignore)
- Keep these credentials secret
- Test credentials are safe to share with team members

## Step 3: Restart the Server

After updating the .env file:

1. **Stop the current server**
   - Press `Ctrl+C` in the terminal running the server
   - Or close the terminal window

2. **Restart the server**
   ```bash
   cd backend
   npm start
   ```

3. **Verify in logs**
   - Look for: `✅ Razorpay initialized with key: rzp_test_YOUR_KEY_ID`
   - This confirms your new credentials are loaded

## Step 4: Test Your Setup

Run the test script:
```bash
cd backend
node test-razorpay.js
```

Expected output for success:
```
✅ SUCCESS! Razorpay endpoint is working.
```

## Common Issues

### Issue: "Invalid key_id"
- Cause: Wrong credentials or incorrect copy/paste
- Fix: Double-check you copied the FULL key from Razorpay dashboard
- Verify there are no extra spaces

### Issue: "Invalid key_secret"  
- Cause: Mismatched credentials or typo
- Fix: Ensure key_secret matches your key_id
- Go back to dashboard and copy again

### Issue: Server still shows old credentials
- Cause: Server not restarted after .env change
- Fix: Stop server (Ctrl+C) and restart with `npm start`

### Issue: Razorpay not initialized message
- Cause: Environment variables not loaded or empty
- Fix: Check .env file format (no quotes, proper spacing)
- Example: `RAZORPAY_KEY_ID=rzp_test_abc123` (NOT `RAZORPAY_KEY_ID="rzp_test_abc123"`)

## Verify Credentials Are Working

1. **Check server startup logs**
   ```
   ✅ Razorpay initialized with key: rzp_test_YOUR_KEY_ID
   ```

2. **Make a test payment request**
   - Ensure you're authenticated (have a valid JWT token)
   - Send POST request to: `http://localhost:5001/api/payments/razorpay/create-order`
   - Check the response for success or detailed error

3. **Monitor payment.log**
   - Server logs will show detailed Razorpay API responses
   - Look for: `✅ Razorpay order created:` for success
   - Or `❌ Razorpay API Error:` for failures

## Testing with Real Test Credentials

Razorpay provides test payment cards:

**Success Test Card:**
- Card Number: 4111111111111111
- Expiry: 12/25
- CVV: 123
- Name: Any name

**Failed Payment Test Card:**
- Card Number: 4000000000000002  
- Expiry: 12/25
- CVV: 123

Use these to test the payment flow without real transactions.

## Security Best Practices

1. **Never commit .env to git** - Add to `.gitignore`
2. **Keep test credentials secret** - They can be abused
3. **Use environment-specific keys** - Different keys for dev/staging/production
4. **Rotate credentials regularly** - Regenerate if compromised
5. **Never share live keys** - Only test keys with team

## Troubleshooting Commands

Check if server is running on correct port:
```bash
netstat -ano | findstr :5001
```

View current .env configuration:
```bash
cat backend/.env
```

View server logs:
```bash
cat backend/server.log
```

## Need Help?

If credentials still aren't working:
1. Verify credentials on Razorpay dashboard once more
2. Check server logs for specific error messages
3. Ensure server was restarted after .env update
4. Try with a different test payment card
5. Contact Razorpay support: https://razorpay.com/support/
