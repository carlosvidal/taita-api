#!/usr/bin/env node

/**
 * Cloudinary Production Debug Script
 * 
 * This script helps diagnose Cloudinary upload issues in production.
 * Run this on your Render.com deployment to check configuration.
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 CLOUDINARY PRODUCTION DIAGNOSTIC');
console.log('=====================================\n');

// 1. Environment Variables Check
console.log('📋 Environment Variables:');
console.log('-------------------------');

const requiredVars = {
  'CLOUDINARY_CLOUD_NAME': process.env.CLOUDINARY_CLOUD_NAME,
  'CLOUDINARY_API_KEY': process.env.CLOUDINARY_API_KEY,
  'CLOUDINARY_API_SECRET': process.env.CLOUDINARY_API_SECRET
};

let allVarsSet = true;

for (const [name, value] of Object.entries(requiredVars)) {
  if (value) {
    console.log(`✅ ${name}: SET`);
    // Show partial value for debugging (first 3 and last 3 chars)
    if (value.length > 6) {
      console.log(`   Value: ${value.slice(0, 3)}***${value.slice(-3)}`);
    }
  } else {
    console.log(`❌ ${name}: MISSING`);
    allVarsSet = false;
  }
}

console.log(`\n📊 Result: ${allVarsSet ? '✅ All variables set' : '❌ Missing variables'}\n`);

// 2. Cloudinary Configuration Test
console.log('⚙️  Cloudinary Configuration Test:');
console.log('----------------------------------');

try {
  // Dynamic import to avoid top-level import issues
  const { default: cloudinaryService } = await import('./src/services/cloudinary.js');
  
  const isConfigured = cloudinaryService.isConfigured();
  console.log(`Configuration Status: ${isConfigured ? '✅ Configured' : '❌ Not Configured'}`);
  
  if (!isConfigured) {
    console.log('\n🚨 ISSUE DETECTED: Cloudinary is not properly configured!');
    console.log('\n📝 To fix this on Render.com:');
    console.log('1. Go to your service dashboard');
    console.log('2. Navigate to Environment tab');
    console.log('3. Add/verify these environment variables:');
    console.log('   - CLOUDINARY_CLOUD_NAME (your cloud name)');
    console.log('   - CLOUDINARY_API_KEY (your API key)');
    console.log('   - CLOUDINARY_API_SECRET (your API secret)');
    console.log('4. Redeploy your service');
    console.log('\n🔗 Find these values in your Cloudinary Dashboard:');
    console.log('   https://console.cloudinary.com/settings/api-keys');
  } else {
    // 3. Connection Test
    console.log('\n🌐 Connection Test:');
    console.log('------------------');
    
    try {
      // Create a simple test image
      const sharp = await import('sharp');
      const testBuffer = await sharp.default({
        create: {
          width: 1,
          height: 1,
          channels: 3,
          background: { r: 255, g: 0, b: 0 }
        }
      }).jpeg().toBuffer();
      
      console.log('Attempting test upload...');
      
      const uploadResult = await cloudinaryService.uploadImage(testBuffer, {
        folder: 'taita-blog/diagnostics',
        publicId: `diagnostic-${Date.now()}`,
        entityType: 'diagnostic',
        entityId: 'test'
      });
      
      console.log('✅ Upload successful!');
      console.log(`   URL: ${uploadResult.url}`);
      console.log(`   Public ID: ${uploadResult.publicId}`);
      
      // Clean up test image
      try {
        await cloudinaryService.deleteImage(uploadResult.publicId);
        console.log('✅ Test cleanup successful');
      } catch (cleanupError) {
        console.log('⚠️  Test cleanup warning:', cleanupError.message);
      }
      
      console.log('\n🎉 DIAGNOSIS: Cloudinary is working correctly!');
      console.log('   The issue might be with:');
      console.log('   1. Application authentication/authorization');
      console.log('   2. File upload middleware configuration');
      console.log('   3. Database connection issues');
      console.log('   4. Frontend/client-side upload issues');
      
    } catch (connectionError) {
      console.log('❌ Connection test failed!');
      console.log(`   Error: ${connectionError.message}`);
      
      // Provide specific diagnosis based on error
      if (connectionError.message.includes('api_key')) {
        console.log('\n🔍 DIAGNOSIS: API Key Issue');
        console.log('   → Verify CLOUDINARY_API_KEY is correct');
      } else if (connectionError.message.includes('api_secret')) {
        console.log('\n🔍 DIAGNOSIS: API Secret Issue');
        console.log('   → Verify CLOUDINARY_API_SECRET is correct');
      } else if (connectionError.message.includes('cloud_name')) {
        console.log('\n🔍 DIAGNOSIS: Cloud Name Issue');
        console.log('   → Verify CLOUDINARY_CLOUD_NAME is correct');
      } else if (connectionError.message.includes('timeout') || connectionError.message.includes('ETIMEDOUT')) {
        console.log('\n🔍 DIAGNOSIS: Network Issue');
        console.log('   → Check internet connectivity');
        console.log('   → Verify firewall settings');
        console.log('   → Try again in a few minutes');
      } else {
        console.log('\n🔍 DIAGNOSIS: Unknown Error');
        console.log('   → Check Cloudinary service status');
        console.log('   → Verify account is active');
        console.log('   → Check usage limits and billing');
      }
    }
  }
  
} catch (importError) {
  console.log('❌ Failed to load Cloudinary service');
  console.log(`   Error: ${importError.message}`);
  console.log('\n🔍 This might indicate a code or dependency issue.');
}

console.log('\n📄 Additional Debugging Steps:');
console.log('------------------------------');
console.log('1. Check application logs for recent upload attempts');
console.log('2. Verify the media upload endpoint is receiving requests');
console.log('3. Test upload directly via API with curl or Postman');
console.log('4. Check database for recent media entries');
console.log('5. Verify authentication tokens are valid');

console.log('\n🔚 Diagnostic Complete');
console.log('======================');

process.exit(0);