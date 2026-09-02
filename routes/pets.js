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
    console.error('Error al registrar mascota:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /pets/api/:id - Devuelve los datos de la mascota en JSON para el frontend
router.get('/api/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const petResult = await db.query('SELECT * FROM pets WHERE id = $1', [id]);

    if (petResult.rows.length === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    res.json(petResult.rows[0]);
  } catch (error) {
    console.error('Error al obtener datos en JSON:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /pets/:id - Escaneo inicial de QR / NFC (Sirve la vista HTML y registra la IP)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    const petResult = await db.query('SELECT * FROM pets WHERE id = $1', [id]);
    if (petResult.rows.length === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    // Registrar el escaneo básico (sin GPS todavía)
    await db.query(
      'INSERT INTO scans (pet_id, ip_address, user_agent) VALUES ($1, $2, $3)',
      [id, ip, userAgent]
    );

    res.sendFile(path.join(__dirname, '../public', 'index.html'));
  } catch (error) {
    console.error('Error al procesar la vista HTML:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /pets/scans/location - Guardar las coordenadas GPS obtenidas desde el frontend
router.post('/scans/location', async (req, res) => {
  try {
    const { pet_id, latitude, longitude } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    if (!pet_id || !latitude || !longitude) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (pet_id, latitud o longitud)' });
    }

    await db.query(
      `INSERT INTO scans (pet_id, ip_address, user_agent, latitude, longitude) 
       VALUES ($1, $2, $3, $4, $5)`,
      [pet_id, ip, userAgent, latitude, longitude]
    );

    res.status(200).json({ message: 'Ubicación registrada con éxito en la base de datos' });
  } catch (error) {
    console.error('Error al guardar ubicación GPS:', error);
    res.status(500).json({ error: 'Error interno al guardar ubicación' });
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