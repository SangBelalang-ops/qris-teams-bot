cat > README.md <<'EOF'
QRIS Teams Bot

Simple skeleton to check account via QRIS Ajaib (web GET→POST flow) and post results to a Microsoft Teams channel using an Incoming Webhook.

Files:
- check-qris.js  : core logic to GET CSRF + POST form and parse HTML result
- server.js      : Express web UI (form) and endpoint to trigger check, posts to Teams webhook
- package.json   : project metadata and dependencies
- .env.example   : environment variable template

Run locally:
1. npm install
2. copy .env.example -> .env and fill TEAMS_WEBHOOK_URL
3. npm start
4. open http://localhost:3000 and submit bank + account

Notes:
- Update bankMap in server.js with the bank_id UUIDs you use.
- If the QRIS site requires authentication/session, the GET→POST flow may fail.
EOF
