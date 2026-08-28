const express = require('express');
const cors = require('cors');
const path = require('path');
const qrcode = require('qrcode');

// Importamos la conexión a la base de datos que creaste en db.js
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Servidor del Collar QR/NFC corriendo correctamente 🐶');
});

// POST /pets - Registrar una nueva mascota
app.post('/pets', async (req, res) => {
  try {
    // 1. Extraemos los campos que nos envía el cliente en el cuerpo (body)
    const { name, contact_phone, medical_info } = req.body;

    // Validación básica
    if (!name) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    // 2. Ejecutamos la consulta SQL en PostgreSQL
    // Usamos $1, $2, $3 por seguridad (evita Inyección SQL)
    const query = `
      INSERT INTO pets (name, contact_phone, medical_info)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const values = [name, contact_phone, medical_info];

    const result = await db.query(query, values);

    // 3. Respondemos con código 201 (Creado) y la mascota creada (con su id UUID)
    res.status(201).json({
      message: 'Mascota creada con éxito',
      pet: result.rows[0]
    });

  } catch (error) {
    console.error('Error al crear mascota:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /pets/:id - Escaneo de QR / NFC
app.get('/pets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Capturamos datos del dispositivo que escanea
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    // 1. Buscamos la mascota por su UUID
    const petQuery = 'SELECT * FROM pets WHERE id = $1';
    const petResult = await db.query(petQuery, [id]);

    if (petResult.rows.length === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    // 2. Registramos la lectura en la tabla scans (Auditoría)
    const scanQuery = `
      INSERT INTO scans (pet_id, ip_address, user_agent)
      VALUES ($1, $2, $3);
    `;
    await db.query(scanQuery, [id, ip, userAgent]);

    // 3. Devolvemos la vista HTML en lugar del JSON plano
    res.sendFile(path.join(__dirname, 'public', 'index.html'));

  } catch (error) {
    console.error('Error al procesar el escaneo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/pets/:id - Devuelve solo los datos JSON de la mascota
app.get('/api/pets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const petResult = await db.query('SELECT * FROM pets WHERE id = $1', [id]);

    if (petResult.rows.length === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    res.json(petResult.rows[0]);
  } catch (error) {
    console.error('Error al obtener datos de la mascota:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /pets/:id/qr - Genera e imprime/descarga la imagen del código QR
app.get('/pets/:id/qr', async (req, res) => {
  try {
    const { id } = req.params;

    // Detecta la URL pública configurada en .env o toma la actual por defecto
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const urlEscaneo = `${baseUrl}/pets/${id}`;

    const qrBuffer = await qrcode.toBuffer(urlEscaneo, {
      type: 'png',
      width: 400,
      margin: 2,
      color: {
        dark: '#2e5a44',  // Color Japandi
        light: '#ffffff'
      }
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="qr-pet-${id}.png"`);
    res.send(qrBuffer);

  } catch (error) {
    console.error('Error al generar el código QR:', error);
    res.status(500).json({ error: 'Error al generar el código QR' });
  }
});

// POST /scans/location - Guardar coordenadas GPS del escaneo
app.post('/scans/location', async (req, res) => {
  try {
    const { pet_id, latitude, longitude } = req.body;

    // Validación de campos obligatorios
    if (!pet_id || !latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Faltan datos requeridos: pet_id, latitude y longitude son obligatorios' 
      });
    }

    // Insertar el registro de geolocalización en PostgreSQL
    const query = `
      INSERT INTO scans (pet_id, latitude, longitude, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [
      pet_id, 
      latitude, 
      longitude, 
      req.ip || req.headers['x-forwarded-for'], 
      req.headers['user-agent']
    ];

    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Ubicación registrada con éxito',
      scan: result.rows[0]
    });

  } catch (error) {
    console.error('Error al guardar la ubicación GPS:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/pets/:id/status - Cambiar estado de la mascota
app.patch('/api/pets/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_lost } = req.body;

    const query = 'UPDATE pets SET is_lost = $1 WHERE id = $2 RETURNING *;';
    const result = await db.query(query, [is_lost, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    res.json({ message: 'Estado actualizado', pet: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Arrancar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor listo escuchando en http://localhost:${PORT}`);
});
