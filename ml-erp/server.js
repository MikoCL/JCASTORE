const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
const { Pool } = require('pg');
const { sendLowStockAlert } = require('./notifications');

const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ML_API = 'https://api.mercadolibre.com';

async function getValidToken(mlUserId) {
  const res = await pool.query('SELECT * FROM ml_accounts WHERE ml_user_id = $1', [mlUserId]);
  const account = res.rows[0];
  if (!account) throw new Error('Cuenta no registrada');

  if (new Date() >= new Date(account.token_expires_at)) {
    const response = await axios.post(`${ML_API}/oauth/token`, {
      grant_type: 'refresh_token',
      client_id: process.env.ML_APP_ID,
      client_secret: process.env.ML_CLIENT_SECRET,
      refresh_token: account.refresh_token,
    });
    const { access_token, refresh_token, expires_in } = response.data;
    const expiresAt = new Date(Date.now() + (expires_in - 600) * 1000);
    await pool.query(
      'UPDATE ml_accounts SET access_token = $1, refresh_token = $2, token_expires_at = $3 WHERE id = $4',
      [access_token, refresh_token, expiresAt, account.id]
    );
    return access_token;
  }
  return account.access_token;
}

app.post('/webhooks/mercadolibre', async (req, res) => {
  res.status(200).send('OK');
  const { topic, resource, user_id } = req.body;
  try {
    if (topic === 'orders_v2') {
      console.log('Orden recibida de ML:', resource);
    }
  } catch (err) {
    console.error('Error en webhook:', err.message);
  }
});

app.listen(3000, () => console.log('ERP Mercado Libre corriendo en puerto 3000'));