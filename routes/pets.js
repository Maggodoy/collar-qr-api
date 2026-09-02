const express = require('express');
const router = express.Router();
const path = require('path');
const qrcode = require('qrcode');
const db = require('../db');
const nodemailer = require('nodemailer');
const authMiddleware = require('../middleware/auth');

// POST /pets - Registrar mascota
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, contact_phone, notification_emails, medical_info } = req.body;
    const userId = req.user.userId; // Obtenido desde el token JWT

    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const query = `
      INSERT INTO pets (name, contact_phone, notification_emails, medical_info, user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await db.query(query, [name, contact_phone, notification_emails, medical_info, userId]);
    res.status(201).json({ message: 'Mascota creada con éxito', pet: result.rows[0] });
  } catch (error) {
    console.error('Error al crear mascota:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /pets/user/all - Obtener todas las mascotas del usuario logueado
router.get('/user/all', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await db.query('SELECT * FROM pets WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener mascotas:', error);
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

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Tu correo
    pass: process.env.EMAIL_PASS  // Tu contraseña de aplicación de Gmail
  }
});

// Dentro de router.post('/scans/location', ...)
router.post('/scans/location', async (req, res) => {
  try {
    const { pet_id, latitude, longitude } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    // 1. Guardar en PostgreSQL
    await db.query(
      `INSERT INTO scans (pet_id, ip_address, user_agent, latitude, longitude) 
       VALUES ($1, $2, $3, $4, $5)`,
      [pet_id, ip, userAgent, latitude, longitude]
    );

    // 2. Enviar notificación por email
    const mapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    
    transporter.sendMail({
      from: '"Alerta Mascota QR" <no-reply@collarqr.com>',
      to: process.env.NOTIFY_EMAIL, // El mail donde querés recibir la alerta
      subject: '🚨 ¡Escaneo detectado con ubicación GPS!',
      html: `
        <h2>¡Alguien escaneó el collar!</h2>
        <p>Se capturaron coordenadas GPS del dispositivo:</p>
        <p><b>Ver ubicación en Google Maps:</b> <a href="${mapUrl}">${mapUrl}</a></p>
        <p><small>IP: ${ip} | Dispositivo: ${userAgent}</small></p>
      `
    }).catch(err => console.error('Error enviando email:', err));

    res.status(200).json({ message: 'Ubicación registrada y notificación enviada' });
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