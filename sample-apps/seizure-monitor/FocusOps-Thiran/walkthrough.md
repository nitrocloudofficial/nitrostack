# Walkthrough: Live API Connections & Gemini AI Prioritization

We have integrated real-world API connections and Gemini LLM prioritization into the `notification-prioritizer` server.

---

## What We Built

### 1. Local Google OAuth Callback Server
- When the MCP server boots up (via `npm run dev`), it starts a background HTTP listener on **port 3000**.
- It listens for `/oauth/google/login` and redirects users to Google's authentication page.
- It captures the callback at `/oauth/google/callback`, exchanges the authorization code for access/refresh tokens, and saves them in `google_tokens.json`.

### 2. Live Gmail & Calendar Integrations
- Connects to the **Gmail API** to fetch unread emails and maps them.
- Connects to the **Google Calendar API** to retrieve upcoming scheduled meetings.
- Features dynamic token rotation: if the access token expires, it uses the refresh token to renew it.

### 3. Live Slack, Jira, and GitHub Connectors
- **Slack**: Fetches messages from joined channels, mentions, and DMs using the `SLACK_USER_TOKEN` (resolves Slack user IDs to display names).
- **Jira**: Authenticates using `JIRA_EMAIL` and `JIRA_API_TOKEN` to retrieve issues currently assigned to you on `vaijayanti.atlassian.net`.
- **GitHub**: Authenticates using `GITHUB_TOKEN` to retrieve repository pull requests and build status updates.

### 4. Gemini AI Prioritization Engine
- When `GEMINI_API_KEY` is present in the `.env` file, the rule-based scorer is swapped for a live **Gemini 1.5 Flash** model request.
- Gemini reads the user context and the list of notifications, and returns structured JSON classifying them into `urgent_now`, `normal`, and `fyi_only` with a contextual reason.

---

## Local Verification & Testing

### A. Testing Google OAuth Flow
1. Start the dev server in your terminal:
   ```bash
   npm run dev
   ```
2. Once the server is ready, visit the login helper in your browser:
   **[http://localhost:3000/oauth/google/login](http://localhost:3000/oauth/google/login)**
3. Authenticate with your Google account. Upon success, you will see the message: **"Authentication Successful!"**
4. Check your project folder—a `google_tokens.json` file will have been generated, containing your credentials.

### B. Testing the Prioritizer
1. Open the interactive dashboard:
   **[http://localhost:3001/priority-dashboard](http://localhost:3001/priority-dashboard)**
2. Click **Launch Feature Dashboard**.
3. The dashboard will now fetch and display your live notifications from Google, Slack, Jira, and GitHub, triaged dynamically using Gemini AI!
4. Try sending yourself a direct message on your testing Slack or assigning yourself a Jira issue, reload the dashboard, and watch it show up in the feed.
