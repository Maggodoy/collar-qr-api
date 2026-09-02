const express = require('express');
const router = express.Router();
const path = require('path');
const qrcode = require('qrcode');
const db = require('../db');
const nodemailer = require('nodemailer');
const authMiddleware = require('../middleware/auth');

// Configuración de nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// POST /pets - Registrar mascota
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, contact_phone, notification_emails, medical_info } = req.body;
    const userId = req.user.userId;

    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const query = `
      INSERT INTO pets (name, contact_phone, notification_emails, medical_info, user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    await db.query(query, [name, contact_phone, notification_emails || null, medical_info || null, userId]);
    
    // Corregido: 5 marcadores de posición para los 5 valores
    const result = await db.query(query, [name, contact_phone, notification_emails || null, medical_info || null, userId]);
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

// POST /pets/scans/location - Guardar coordenadas GPS y enviar alerta por email
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

    // 2. Buscar datos de la mascota para obtener sus emails de notificación
    const petQuery = await db.query('SELECT name, notification_emails FROM pets WHERE id = $1', [pet_id]);
    const pet = petQuery.rows[0];

    const destinatarios = (pet && pet.notification_emails) ? pet.notification_emails : process.env.NOTIFY_EMAIL;
    const nombreMascota = pet ? pet.name : 'tu mascota';

    // 3. Enviar notificación por email
    const mapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    
    transporter.sendMail({
      from: '"Alerta Mascota QR" <no-reply@collarqr.com>',
      to: destinatarios,
      subject: `🚨 ¡Escaneo detectado para ${nombreMascota}!`,
      html: `
        <h2>¡Alguien escaneó el collar de ${nombreMascota}!</h2>
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