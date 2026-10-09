#!/usr/bin/env node

/**
 * Simple test script to verify Razorpay endpoint
 * Run: node test-razorpay.js
 */

const http = require('http');

// Configuration
const API_URL = 'http://localhost:5001/api/payments/razorpay/create-order';
const MOCK_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwZDVlYzQ4OGY0ZDI3MDAxNmEzZjM1NCIsIm5hbWUiOiJUZXN0IFVzZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiY2xpZW50In0.test'; // Replace with real token

const payload = {
  amount: 500,
  currency: 'INR',
  gig: 'test-gig-' + Date.now()
};

console.log('🧪 Testing Razorpay Create Order Endpoint');
console.log('━'.repeat(50));
console.log('📍 Endpoint:', API_URL);
console.log('💳 Payload:', JSON.stringify(payload, null, 2));
console.log('━'.repeat(50));

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/payments/razorpay/create-order',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${MOCK_JWT_TOKEN}`,
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📬 Response Status:', res.statusCode);
    console.log('📝 Response Headers:', JSON.stringify(res.headers, null, 2));
    console.log('📊 Response Body:');
    
    try {
      const parsedData = JSON.parse(data);
      console.log(JSON.stringify(parsedData, null, 2));
    } catch (e) {
      console.log(data);
    }

    if (res.statusCode === 200) {
      console.log('\n✅ SUCCESS! Razorpay endpoint is working.');
    } else {
      console.log('\n❌ ERROR! Check the response above for details.');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request Error:', e.message);
  if (e.code === 'ECONNREFUSED') {
    console.error('⚠️  Connection refused! Make sure:');
    console.error('   1. Backend server is running on port 5001');
    console.error('   2. Try: npm start in the backend directory');
  }
});

req.write(JSON.stringify(payload));
req.end();

console.log('\n📤 Request sent... waiting for response...\n');
