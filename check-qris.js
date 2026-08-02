cat > check-qris.js <<'EOF'
/* check-qris.js
   GET CSRF token & cookies, then POST form to check account and parse HTML */
require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');

const BASE = process.env.QRIS_BASE_URL || 'https://apps.flazzqris.com';
const CHECK_PATH = '/check-account';

async function getCsrfAndCookies() {
  const res = await axios.get(BASE + CHECK_PATH, {
    headers: { 'User-Agent': process.env.USER_AGENT || 'qris-bot/1.0' },
    maxRedirects: 5,
    validateStatus: s => s >= 200 && s < 400
  });
  const setCookie = res.headers['set-cookie'] || [];
  const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');
  const $ = cheerio.load(res.data);
  const token = $('meta[name="csrf-token"]').attr('content') || $('input[name="_token"]').val();
  return { token, cookieHeader };
}

async function checkAccount(bank_id, account_no) {
  const { token, cookieHeader } = await getCsrfAndCookies();
  if (!token) throw new Error('CSRF token not found; page may require auth');
  const body = qs.stringify({ _token: token, bank_id, account_no });
  const res = await axios.post(BASE + CHECK_PATH, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookieHeader,
      'Referer': BASE + CHECK_PATH,
      'Origin': BASE,
      'User-Agent': process.env.USER_AGENT || 'qris-bot/1.0'
    },
    maxRedirects: 5
  });
  const $ = cheerio.load(res.data);
  const alertText = $('.alert').first().text().trim();
  if (alertText) {
    const exists = /Account exists/i.test(alertText);
    const bankMatch = alertText.match(/Bank Name:([^<\n\r]+)/i);
    const nameMatch = alertText.match(/Account Name:([^<\n\r]+)/i);
    const noMatch = alertText.match(/Account No:([^<\n\r]+)/i);
    return {
      success: true,
      exists,
      bank: bankMatch ? bankMatch[1].trim() : null,
      account_name: nameMatch ? nameMatch[1].trim() : null,
      account_no: noMatch ? noMatch[1].trim() : null,
      raw: alertText
    };
  }
  return { success: false, html: res.data };
}

module.exports = { checkAccount };

if (require.main === module) {
  (async () => {
    const [, , bank_id, account_no] = process.argv;
    if (!bank_id || !account_no) {
      console.log('Usage: node check-qris.js <bank_id> <account_no>');
      process.exit(1);
    }
    try {
      const r = await checkAccount(bank_id, account_no);
      console.log(r);
    } catch (e) {
      console.error('ERR', e.message || e);
    }
  })();
}
EOF
