const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/', require('./routes/health.routes'));
app.use('/', require('./routes/auth.routes'));
app.use('/', require('./routes/usuarios.routes'));
app.use('/', require('./routes/informacion.routes'));
app.use('/', require('./routes/reportes.routes'));
app.use('/', require('./routes/dashboard.routes'));
app.use('/', require('./routes/comercial.routes'));
app.use('/', require('./routes/facturas.routes'));

app.use((req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada' }));
app.use((error, _req, res, _next) => {
  console.error('Error no controlado:', error);
  res.status(500).json({ mensaje: 'Error interno del servidor' });
});

module.exports = app;
