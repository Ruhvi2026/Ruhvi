/**
 * Meta Interactive Browser Helper for Project Ruhvi
 *
 * Launches a real Google Chrome window on the user's desktop so they can log in
 * with Facebook credentials and complete 2-Step Verification.
 * Once logged in, this script automatically extracts the Meta Ad Account ID (act_...)
 * and navigates to the Token Generator for App 1516695129765369.
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';
import readline from 'readline';

const APP_ID = '1516695129765369';
const ENV_PATH = path.resolve(process.cwd(), '.env.local');
const USER_DATA_DIR = path.join(os.tmpdir(), 'ruhvi_meta_browser_profile');

console.log('===================================================================');
console.log('  🚀 RUHVI AI CO-FOUNDER: META INTERACTIVE BROWSER LOGIN HELPER');
console.log('===================================================================');
console.log('Opening Google Chrome in headed mode on your desktop...');

async function run() {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1366, height: 850 },
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || (await context.newPage());

  console.log('\n[1/3] Navigating to Meta Ads Manager...');
  await page.goto('https://adsmanager.facebook.com/', { waitUntil: 'domcontentloaded' }).catch(() => {});

  console.log('\n-------------------------------------------------------------------');
  console.log('  👉 ACTION REQUIRED ON YOUR SCREEN:');
  console.log('  1. Look at the Chrome window that just opened.');
  console.log('  2. Log in with your Facebook credentials.');
  console.log('  3. Complete your 2-Step Verification (OTP / Authenticator App).');
  console.log('-------------------------------------------------------------------\n');
  console.log('Waiting for login completion (monitoring URL for Ads Manager / act_ ID)...');

  let detectedAdAccountId = null;

  // Poll for URL change to detect login and Ad Account ID
  const checkInterval = setInterval(async () => {
    try {
      const currentUrl = page.url();

      // Check if logged in and URL has act= or act_
      const actMatch = currentUrl.match(/[?&]act=([0-9]+)/i) || currentUrl.match(/act_([0-9]+)/i);
      if (actMatch && actMatch[1]) {
        detectedAdAccountId = `act_${actMatch[1]}`;
        clearInterval(checkInterval);
        onLoginSuccess(context, page, detectedAdAccountId);
      } else if (
        currentUrl.includes('adsmanager.facebook.com/adsmanager') &&
        !currentUrl.includes('/login')
      ) {
        // Also check localStorage / DOM for act_ id
        const extracted = await page.evaluate(() => {
          const match = document.body.innerText.match(/act_([0-9]{8,20})/);
          return match ? match[0] : null;
        }).catch(() => null);

        if (extracted) {
          detectedAdAccountId = extracted;
          clearInterval(checkInterval);
          onLoginSuccess(context, page, detectedAdAccountId);
        }
      }
    } catch {}
  }, 2000);

  // Safety timeout: 10 minutes
  setTimeout(() => {
    clearInterval(checkInterval);
  }, 10 * 60 * 1000);
}

async function onLoginSuccess(context, page, adAccountId) {
  console.log('\n🎉 LOGIN DETECTED & AD ACCOUNT FOUND!');
  console.log(`✅ Ad Account ID: ${adAccountId}`);

  // Save to .env.local
  if (fs.existsSync(ENV_PATH)) {
    let envContent = fs.readFileSync(ENV_PATH, 'utf-8');
    if (envContent.includes('META_ADS_ACCOUNT_ID=')) {
      envContent = envContent.replace(/META_ADS_ACCOUNT_ID=.*/g, `META_ADS_ACCOUNT_ID=${adAccountId}`);
    } else {
      envContent += `\nMETA_ADS_ACCOUNT_ID=${adAccountId}\n`;
    }
    fs.writeFileSync(ENV_PATH, envContent, 'utf-8');
    console.log(`💾 Saved META_ADS_ACCOUNT_ID=${adAccountId} directly into .env.local!`);
  }

  console.log('\n[2/3] Now navigating to Meta Graph API Explorer for App ' + APP_ID + '...');
  const tokenUrl = `https://developers.facebook.com/tools/explorer/?app_id=${APP_ID}`;
  
  const tokenPage = await context.newPage();
  await tokenPage.goto(tokenUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});

  console.log('\n-------------------------------------------------------------------');
  console.log('  👉 FINAL STEP: GENERATE ACCESS TOKEN');
  console.log('  In the Graph API Explorer tab that just opened:');
  console.log('  1. Ensure Meta App is set to "1516695129765369"');
  console.log('  2. Click "Add a Permission" and select:');
  console.log('     - ads_read');
  console.log('     - ads_management');
  console.log('     - read_insights');
  console.log('  3. Click "Generate Access Token" and approve permissions.');
  console.log('  4. Copy the generated Access Token (EAA...) and paste it in chat!');
  console.log('-------------------------------------------------------------------\n');
  console.log('Press Ctrl+C in this terminal when you are done, or close the browser window.');
}

run().catch((err) => {
  console.error('Fatal error running interactive browser:', err);
});
