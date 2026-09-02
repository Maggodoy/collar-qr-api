const express = require('express');
const router = express.Router();
const path = require('path');
const qrcode = require('qrcode');
const db = require('../db'); // Subimos un nivel para encontrar db.js

// POST /pets - Registrar mascota
router.post('/', async (req, res) => {
  try {
    const { name, contact_phone, medical_info } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const query = `
      INSERT INTO pets (name, contact_phone, medical_info)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await db.query(query, [name, contact_phone, medical_info]);
    res.status(201).json({ message: 'Mascota creada con éxito', pet: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /pets/:id - Escaneo de QR / NFC
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    const petResult = await db.query('SELECT * FROM pets WHERE id = $1', [id]);
    if (petResult.rows.length === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    await db.query(
      'INSERT INTO scans (pet_id, ip_address, user_agent) VALUES ($1, $2, $3)',
      [id, ip, userAgent]
    );

    res.sendFile(path.join(__dirname, '../public', 'index.html'));
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /pets/:id/qr - Generar imagen del QR
router.get('/:id/qr', async (req, res) => {
  try {
    const { id } = req.params;
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const urlEscaneo = `${baseUrl}/pets/${id}`;

    const qrBuffer = await qrcode.toBuffer(urlEscaneo, {
      type: 'png',
      width: 400,
      margin: 2,
      color: { dark: '#2e5a44', light: '#ffffff' }
    });

    res.setHeader('Content-Type', 'image/png');
    res.send(qrBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Error al generar el código QR' });
  }
});

module.exports = router;