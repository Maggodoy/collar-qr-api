const express = require('express');
const router = express.Router();
const path = require('path');
const qrcode = require('qrcode');
const db = require('../db');
const nodemailer = require('nodemailer');
const authMiddleware = require('../middleware/auth');

// POST /pets - Registrar mascota (Solo para usuario dueño autenticado)
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
    const result = await db.query(
      'SELECT id, name, contact_phone, notification_emails, medical_info, is_lost FROM pets WHERE user_id = $1 ORDER BY id DESC', 
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener mascotas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /pets/:id/status - Cambiar estado (Perdida/Encontrada) (Protegido para el dueño)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_lost } = req.body;
    const userId = req.user.userId;

    if (typeof is_lost !== 'boolean') {
      return res.status(400).json({ error: 'El parámetro is_lost debe ser un valor booleano' });
    }

    const query = `
      UPDATE pets 
      SET is_lost = $1 
      WHERE id = $2 AND user_id = $3 
      RETURNING id, name, is_lost;
    `;
    const result = await db.query(query, [is_lost, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada o no autorizada' });
    }

    res.json({ message: 'Estado de la mascota actualizado con éxito', pet: result.rows[0] });
  } catch (error) {
    console.error('Error al cambiar estado de la mascota:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /pets/:id - Actualizar datos de una mascota
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_phone, notification_emails, medical_info } = req.body;
    const userId = req.user.userId;

    const query = `
      UPDATE pets 
      SET name = $1, contact_phone = $2, notification_emails = $3, medical_info = $4
      WHERE id = $5 AND user_id = $6
      RETURNING *;
    `;
    const result = await db.query(query, [name, contact_phone, notification_emails || null, medical_info || null, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada o no autorizada' });
    }

    res.json({ message: 'Mascota actualizada correctamente', pet: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar mascota:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /pets/:id - Eliminar una mascota
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await db.query('DELETE FROM pets WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada o no autorizada' });
    }

    res.json({ message: 'Mascota eliminada con éxito' });
  } catch (error) {
    console.error('Error al eliminar mascota:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /pets/api/:id - Devuelve los datos de la mascota en JSON para la vista pública
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

// GET /pets/:id - Escaneo inicial de QR / NFC (Sirve la vista HTML, registra el escaneo y notifica por IP)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener IP real detrás de Render o proxies
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ip = rawIp.split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || 'Desconocido';

    // 1. Verificar si la mascota existe
    const petResult = await db.query('SELECT name, notification_emails FROM pets WHERE id = $1', [id]);
    if (petResult.rows.length === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    const pet = petResult.rows[0];

    // 2. Registrar el escaneo inicial en la base de datos
    await db.query(
      'INSERT INTO scans (pet_id, ip_address, user_agent) VALUES ($1, $2, $3)',
      [id, ip, userAgent]
    );

    // 3. Enviar email de alerta básica inmediata con transporter dinámico
    const destinatarios = (pet && pet.notification_emails) ? pet.notification_emails : process.env.NOTIFY_EMAIL;

    if (destinatarios) {
      const dynamicTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      dynamicTransporter.sendMail({
        from: `"Alerta Mascota QR" <${process.env.EMAIL_USER}>`,
        to: destinatarios,
        subject: `🚨 ¡Escanearon el collar de ${pet.name}!`,
        html: `
          <h2>¡Alguien acaba de escanear el código QR de ${pet.name}!</h2>
          <p>Se ha detectado una lectura del collar sin necesidad de confirmación de GPS.</p>
          <hr>
          <h3>Datos capturados del dispositivo:</h3>
          <ul>
            <li><b>Dirección IP:</b> ${ip}</li>
            <li><b>Dispositivo / Navegador:</b> ${userAgent}</li>
            <li><b>Fecha y Hora:</b> ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</li>
          </ul>
          <p><i>Si el usuario acepta compartir su ubicación GPS precisa, recibirás un correo adicional con el mapa exacto de Google Maps.</i></p>
        `
      }).then(() => {
        console.log(`✅ Email de alerta inicial enviado para ${pet.name}`);
      }).catch(err => {
        console.error('Error enviando email inicial de escaneo:', err);
      });
    }

    // 4. Servir la página pública
    res.sendFile(path.join(__dirname, '../public', 'index.html'));

  } catch (error) {
    console.error('Error al procesar el escaneo inicial:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /pets/scans/location - Guardar coordenadas GPS y enviar alerta extendida por email
router.post('/scans/location', async (req, res) => {
  try {
    const { pet_id, latitude, longitude } = req.body;
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ip = rawIp.split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || 'Desconocido';

    // 1. Guardar coordenadas GPS en PostgreSQL
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

    if (!destinatarios) {
      console.warn('⚠️ No se definió destinatario de email ni en la mascota ni en process.env.NOTIFY_EMAIL');
      return res.status(200).json({ message: 'Ubicación registrada, pero no se especificó e-mail de destino' });
    }

    // 3. Crear transporter dinámico para envío de GPS
    const dynamicTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    
    const mailInfo = await dynamicTransporter.sendMail({
      from: `"Alerta Mascota QR" <${process.env.EMAIL_USER}>`,
      to: destinatarios,
      subject: `📍 Ubicación GPS confirmada para ${nombreMascota}`,
      html: `
        <h2>¡Ubicación GPS recibida para ${nombreMascota}!</h2>
        <p>El usuario aceptó compartir su geolocalización exacta desde el navegador:</p>
        <p><b>Ver ubicación en Google Maps:</b> <a href="${mapUrl}" target="_blank">${mapUrl}</a></p>
        <hr>
        <p><small>IP: ${ip} | Dispositivo: ${userAgent}</small></p>
      `
    });

    console.log('✅ Email con GPS enviado con éxito:', mailInfo.messageId);

    res.status(200).json({ message: 'Ubicación registrada y notificación enviada' });
  } catch (error) {
    console.error('Error en el proceso de ubicación o envío de email:', error);
    res.status(500).json({ error: 'Error interno al procesar el escaneo' });
  }
});

// GET /pets/:id/qr - Generar imagen del QR apuntando a la vista pública HTML
router.get('/:id/qr', async (req, res) => {
  try {
    const { id } = req.params;

    const host = req.headers['x-forwarded-host'] || req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
    
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
    console.error('Error al generar QR:', error);
    res.status(500).json({ error: 'Error al generar el código QR' });
  }
});

module.exports = router;