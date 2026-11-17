const nodemailer = require('nodemailer');
const axios = require('axios');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: process.env.SMTP_PORT || 2525,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendLowStockAlert(product) {
  const availableStock = product.physical_stock - product.reserved_stock;
  const alertMessage = `⚠️ ALERTA DE STOCK CRÍTICO ⚠️\nEl producto "${product.name}" (SKU: ${product.sku}) ha llegado a un nivel crítico.\n- Stock Físico: ${product.physical_stock}\n- Stock Reservado: ${product.reserved_stock}\n- Stock Disponible: ${availableStock}\n- Umbral Mínimo: ${product.min_stock_alert}`;

  console.warn(alertMessage);

  try {
    await transporter.sendMail({
      from: '"ERP Alertas" <erp@tu-dominio-erp.cl>',
      to: process.env.ALERT_EMAIL || 'operaciones@tu-dominio-erp.cl',
      subject: `[STOCK CRÍTICO] SKU: ${product.sku} - Quedan ${availableStock} unidades`,
      text: alertMessage,
    });
  } catch (err) {
    console.error('Error enviando correo de alerta:', err.message);
  }
}

module.exports = { sendLowStockAlert };