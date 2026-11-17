const axios = require('axios');

async function emitirDocumentoTributario(order, buyerInfo) {
  const payloadDTE = {
    tipo_documento: buyerInfo.needsInvoice ? '33' : '39',
    encabezado: {
      fecha_emision: new Date().toISOString().split('T')[0],
      rut_receptor: buyerInfo.rut || '66666666-6',
      razon_social: buyerInfo.businessName || order.buyer_nickname,
      giro: buyerInfo.businessActivity || 'Particular',
      direccion: buyerInfo.address || 'Santiago',
      comuna: buyerInfo.commune || 'Santiago'
    },
    items: order.items.map(item => ({
      nombre: item.name,
      cantidad: item.quantity,
      precio_unitario: Math.round(item.unit_price / 1.19),
      exento: 0
    }))
  };

  try {
    const response = await axios.post('https://api.ferre-facturacion.cl/v1/dte', payloadDTE, {
      headers: { Authorization: `Bearer ${process.env.DTE_API_KEY}`, 'Content-Type': 'application/json' }
    });
    return { success: true, dteFolio: response.data.folio, pdfUrl: response.data.pdf_url };
  } catch (error) {
    console.error('Error emitiendo DTE:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { emitirDocumentoTributario };