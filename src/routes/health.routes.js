const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => {
  res.json({ mensaje: 'API de SoftTech Solutions funcionando correctamente' });
});

module.exports = router;
