const express = require('express');
const cors = require('cors');
const petRoutes = require('./routes/pets'); // 1. Importás el archivo

const app = express();
const PORT = process.env.PORT || 3000;
const authRoutes = require('./routes/auth');

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Definición de Rutas
app.use('/pets', petRoutes); // 2. Montás el enrutador en la raíz /pets

app.get('/', (req, res) => {
  res.send('Servidor del Collar QR/NFC corriendo correctamente 🐶');
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});

app.use('/auth', authRoutes);