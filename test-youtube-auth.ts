import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

async function testAuth() {
  console.log('🔐 Testing YouTube Authentication\n');

  // Check environment variables
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  console.log('📋 Configuration Check:');
  console.log(`   YOUTUBE_CLIENT_ID: ${clientId ? '✅ Set' : '❌ Missing'}`);
  console.log(`   YOUTUBE_CLIENT_SECRET: ${clientSecret ? '✅ Set' : '❌ Missing'}`);
  console.log(`   YOUTUBE_REFRESH_TOKEN: ${refreshToken ? '✅ Set' : '❌ Missing'}`);

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('\n❌ Missing required credentials');
    process.exit(1);
  }

  console.log('\n🔑 Credential Format Check:');
  console.log(`   Client ID length: ${clientId.length} chars`);
  console.log(`   Client ID format: ${clientId.includes('.apps.googleusercontent.com') ? '✅ Valid' : '⚠️  Should end with .apps.googleusercontent.com'}`);
  console.log(`   Client Secret length: ${clientSecret.length} chars`);
  console.log(`   Client Secret format: ${clientSecret.startsWith('GOCSPX-') ? '✅ Valid' : '⚠️  Should start with GOCSPX-'}`);
  console.log(`   Refresh Token length: ${refreshToken.length} chars`);
  console.log(`   Refresh Token format: ${refreshToken.startsWith('1//') ? '✅ Valid' : '⚠️  Should start with 1//'}`);

  // Try to create OAuth client
  console.log('\n🔧 Creating OAuth2 Client...');
  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    console.log('✅ OAuth2 client created');

    // Try to get an access token
    console.log('\n🔄 Attempting to refresh access token...');
    const { credentials } = await oauth2Client.refreshAccessToken();

    console.log('✅ Successfully obtained access token!');
    console.log(`   Token type: ${credentials.token_type}`);
    console.log(`   Expires in: ${credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'unknown'}`);

    // Try to access YouTube API
    console.log('\n📺 Testing YouTube API access...');
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const response = await youtube.channels.list({
      part: ['snippet'],
      mine: true,
    });

    if (response.data.items && response.data.items.length > 0) {
      const channel = response.data.items[0];
      console.log('✅ YouTube API access successful!');
      console.log(`   Channel: ${channel.snippet?.title}`);
      console.log(`   Channel ID: ${channel.id}`);
    } else {
      console.log('⚠️  API call succeeded but no channel found');
    }

    console.log('\n✅ All authentication tests passed!');
    console.log('   Your credentials are valid and ready for uploads.');

  } catch (error: any) {
    console.error('\n❌ Authentication test failed:');
    console.error(`   Error: ${error.message}`);

    if (error.response?.data) {
      console.error(`   Details: ${JSON.stringify(error.response.data, null, 2)}`);
    }

    if (error.message.includes('invalid_grant')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Your refresh token may have expired');
      console.error('   2. Regenerate it at: https://developers.google.com/oauthplayground/');
      console.error('   3. Make sure to use the same Client ID and Secret');
      console.error('   4. Select scope: https://www.googleapis.com/auth/youtube.upload');
    } else if (error.message.includes('unauthorized_client')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Verify Client ID and Client Secret match your Google Cloud project');
      console.error('   2. Check that OAuth consent screen is configured');
      console.error('   3. Ensure your email is added as a test user');
      console.error('   4. Verify YouTube Data API v3 is enabled');
    }

    process.exit(1);
  }
}

testAuth();
