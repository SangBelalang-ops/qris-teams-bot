cat > server.js <<'EOF'
/* server.js
   Express UI + endpoint that calls check-qris and posts to Teams webhook */
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { checkAccount } = require('./check-qris');
const axios = require('axios');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// mapping bank code -> bank_id (update values from your HTML select when needed)
const bankMap = {
  'DANA': '01992c0f-d87b-7184-a631-e532b12534e3',
  'BCA':  '01992c0f-d7b0-71d0-aa10-aab26a19de5e',
  'BRI':  '01992c0f-d782-7159-93da-3be711e10c79',
  'MANDIRI': '01992c0f-d78e-73f7-9356-f498372d7b59',
  'BNI':  '01992c0f-d796-738b-8553-97ad0be2e281'
};

// Simple web form
app.get('/', (req, res) => {
  res.send(`
    <h3>QRIS Account Check</h3>
    <form method="post" action="/check">
      <label>Bank code (e.g. DANA, BCA):</label><br/>
      <input name="bank" /><br/>
      <label>Account number:</label><br/>
      <input name="account" /><br/><br/>
      <button type="submit">Check</button>
    </form>
  `);
});

// Endpoint that triggers check and posts to Teams
app.post('/check', async (req, res) => {
  const bank = (req.body.bank || req.query.bank || '').toUpperCase();
  const account = req.body.account || req.query.account;
  const bank_id = bankMap[bank];
  if (!bank_id) return res.send(`Bank ${bank} not configured. Edit bankMap in server.js`);
  try {
    const result = await checkAccount(bank_id, account);
    let message;
    if (result.success && result.exists) {
      message = `✅ VALID\nBank: ${result.bank || bank}\nAccount: ${result.account_no}\nName: ${result.account_name}`;
    } else if (result.success && !result.exists) {
      message = `❌ NOT FOUND\nBank: ${bank}\nAccount: ${account}`;
    } else {
      message = `⚠️ Unexpected response from QRIS.`;
    }
    if (process.env.TEAMS_WEBHOOK_URL) {
      await axios.post(process.env.TEAMS_WEBHOOK_URL, { text: message })
        .catch(err => console.error('Teams post error', err?.response?.data || err.message || err));
    }
    res.send(`<pre>${message}</pre>`);
  } catch (err) {
    console.error(err?.message || err);
    res.status(500).send('Error: ' + (err.message || 'unknown'));
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
EOF
