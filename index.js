const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar rutas
const petRoutes = require('./routes/pets');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Middlewares globales
app.use(cors());
app.use(express.json());

// 2. Servir archivos estáticos de la carpeta public (login.html, dashboard.html, app.js, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// 3. Montar rutas de la API
app.use('/pets', petRoutes);
app.use('/auth', authRoutes);

// 4. Redireccionar la raíz / al login
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// 5. Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});