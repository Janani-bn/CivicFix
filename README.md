# CivicTech Frontend

An AI-powered civic tech solution that allows citizens to report local issues (potholes, garbage, water leaks, streetlight failures) and ensures faster resolution through government integration and community participation.

## Features Built
- Clean, modern UI (Gov-tech + startup style).
- Color palette focused on Trust Blue and Environment Green.
- Interactive, responsive Mobile-first design.
- Complete set of Home Page components:
  - Navigation Bar
  - Dynamic Hero Section linking to live reporting
  - Explainer Section mapping out the user journey
  - Stats Showcase Section
  - Feature Grid highlighting core functionality
  - Comprehensive Interactive "Report an Issue" form with success states.

## Tech Stack
- React
- Vite
- Vanilla CSS
- Lucide React (for icons)

## How to Run Locally

First, ensure you have Node.js installed.

1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/Janani-bn/temp_civic.git
   ```

2. Navigate into the directory and install dependencies:
   ```bash
   cd temp_civic
   npm install
   ```

3. Spin up the development server:
   ```bash
   npm run dev
   ```

Open `http://localhost:5173` to view it in the browser.
## AI Chatbot Setup

CivicFix includes an AI-powered chatbot (powered by Google Gemini) that helps citizens report issues and track complaints through natural conversation.

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **Create API Key** — it's free (15 requests/minute, 1M tokens/day)
4. Copy the key

### Configuring the API Key

Create a `.env` file in the `backend/` folder:
```bash
cp backend/.env.example backend/.env
```
Then edit `backend/.env` and replace the placeholder:
```
GEMINI_API_KEY=your_actual_api_key_here
```

The AI chatbot will work once the key is set. Without it, the rest of the app functions normally — the chatbot simply shows "AI unavailable."

## JWT Authentication Setup

CivicFix requires a securely generated JWT secret to run. If this is missing or uses the default placeholder, the application will crash on boot to prevent security vulnerabilities.

1. Generate a secure random string (at least 32 characters). You can generate a 48-byte hex string by running this command in your terminal:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
2. Add the generated string to your `backend/.env` file:
   ```
   JWT_SECRET=your_generated_secret_here
   ```

## WhatsApp Notifications Setup

CivicFix sends WhatsApp notifications to citizens when their complaint is created, updated, or resolved. This uses Meta's official WhatsApp Cloud API.

### Getting a Temporary Token (Quick, for development)

1. Go to [developers.facebook.com](https://developers.facebook.com) and log in with your Facebook account
2. Click **My Apps** (top-right) > **Create App**
3. Select **Other** as the use case > click **Next**
4. Select **Business** as the app type > click **Next**
5. Name it (e.g., "CivicFix WhatsApp") > click **Create App**
6. On the "Add products" page, find **WhatsApp** and click **Set Up**
7. You'll be taken to **WhatsApp > API Setup**. Copy these two values:
   - **Temporary access token** → this is your `WHATSAPP_TOKEN`
   - **Phone number ID** → this is your `WHATSAPP_PHONE_NUMBER_ID`
8. Scroll down to **"To" field** > click **Manage phone number list** > add your personal WhatsApp number as a test recipient
9. Click **Send Message** to verify — you should receive a "Hello World" message on WhatsApp

Add the values to your `backend/.env`:
```
WHATSAPP_TOKEN=EAAxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=1234567890
```

> **Note:** This token expires after 24 hours. You'll need to revisit step 7 and copy a new one each day during development.

### Getting a Permanent Token (for demos and production)

**Step A — Create a Meta Business Portfolio:**
1. Go to [business.facebook.com](https://business.facebook.com)
2. If you don't have a Business Portfolio, click **Create Account**
3. Enter a business name (e.g., "CivicFix Project"), your name, and email
4. Click **Submit**

**Step B — Link the App to Your Business:**
1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) and open your app
2. Go to **App Settings > Basic**
3. Under **Business Portfolio**, select the one from Step A
4. Click **Save Changes**

**Step C — Create a System User:**
1. Go to [business.facebook.com/settings](https://business.facebook.com/settings)
2. In the left sidebar, click **Users > System Users**
3. Click **Add** > name it "civicfix-api" > select **Admin** role > click **Create**

**Step D — Assign Permissions:**
1. Click on the System User you created ("civicfix-api")
2. Click **Add Assets** > select **Apps** > find your app > toggle **Full Control** > click **Save Changes**

**Step E — Generate the Permanent Token:**
1. Still on the System User page, click **Generate New Token**
2. Select your app
3. Check these permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. Click **Generate Token**
5. **Copy the token immediately** — it is only shown once

Add it to your `backend/.env`:
```
WHATSAPP_TOKEN=EAAxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=1234567890
```

This token **never expires** unless you manually revoke it.

### Finding Your Phone Number ID

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) > open your app
2. Left sidebar: **WhatsApp > API Setup**
3. Under "From", you'll see a phone number with its **Phone number ID** listed below it

### Verifying the Setup

Run this curl command in your terminal (replace the three placeholders):
```bash
curl -X POST "https://graph.facebook.com/v21.0/YOUR_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "YOUR_WHATSAPP_NUMBER_WITH_COUNTRY_CODE",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": { "code": "en_US" }
    }
  }'
```

If you receive a "Hello World" WhatsApp message on your phone, the token is working correctly.

> **Without a token:** The app works normally — WhatsApp notifications are simply skipped.

---

## Troubleshooting: npm install fails with ECONNREFUSED

If `npm install` fails with `ECONNREFUSED` when trying to reach `registry.npmjs.org`, your `/etc/hosts` file may be redirecting the registry to localhost.

### Option 1 — Remove the hosts override (recommended)

```bash
sudo nano /etc/hosts
```

Find and delete (or comment out with `#`) these lines if they exist:
```
127.0.0.1 registry.npmjs.org
::1       registry.npmjs.org
```

Save the file, then flush your DNS cache:
```bash
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
```

After this, `npm install` will work normally.

### Option 2 — Use the IP directly as a workaround

If you cannot edit `/etc/hosts` (e.g., corporate policy), bypass it by pointing npm at the registry IP:

```bash
npm install --registry http://104.16.3.34
```

This tells npm to skip DNS resolution and connect to the npm registry directly.
