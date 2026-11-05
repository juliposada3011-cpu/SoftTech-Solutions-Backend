const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const entidadesComerciales = require('../entities/commercialEntities');

router.post('/api/sistema/preparar-esquema', async (_req, res) => {

  try {

    await pool.query(`CREATE TABLE IF NOT EXISTS proveedor (

      id_proveedor INT NOT NULL AUTO_INCREMENT PRIMARY KEY,

      nit VARCHAR(30) NOT NULL UNIQUE,

      nombre VARCHAR(150) NOT NULL,

      contacto VARCHAR(100) NULL,

      telefono VARCHAR(30) NOT NULL,

      correo VARCHAR(150) NOT NULL,

      direccion VARCHAR(200) NULL,

      fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP

    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Distinguir empleados y vendedores sin perder los registros existentes.
        // Los registros anteriores se consideran vendedores para conservar su uso en facturación.
        const [columnasEmpleado] = await pool.query('SHOW COLUMNS FROM empleado');
        const nombresColumnasEmpleado = columnasEmpleado.map(c => c.Field);
        if (!nombresColumnasEmpleado.includes('tipo_personal')) {
            await pool.query("ALTER TABLE empleado ADD COLUMN tipo_personal ENUM('Empleado','Vendedor') NOT NULL DEFAULT 'Vendedor'");
        }

        const [cols] = await pool.query("SHOW COLUMNS FROM producto");

    const names = cols.map(c => c.Field);

    if (!names.includes('id_proveedor')) await pool.query('ALTER TABLE producto ADD COLUMN id_proveedor INT NULL');

    if (!names.includes('categoria')) await pool.query('ALTER TABLE producto ADD COLUMN categoria VARCHAR(100) NULL');

    const [fk] = await pool.query("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='producto' AND COLUMN_NAME='id_proveedor' AND REFERENCED_TABLE_NAME='proveedor'");

    if (!fk.length) {

      try { await pool.query('ALTER TABLE producto ADD CONSTRAINT fk_producto_proveedor FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor) ON DELETE SET NULL'); } catch (e) { if (e.code !== 'ER_DUP_KEYNAME') throw e; }

    }

    res.json({ mensaje: 'Esquema comercial preparado correctamente' });

  } catch (error) {

    console.error('Preparación de esquema:', error);

    res.status(500).json({ mensaje: 'No fue posible preparar el esquema comercial' });

  }

});



for (const [recurso, cfg] of Object.entries(entidadesComerciales)) {

  router.get(`/api/${recurso}`, async (_req, res) => {

    try {

      const [rows] = await pool.query(`SELECT * FROM ${cfg.tabla} ORDER BY ${cfg.id} DESC`);

      res.json(rows);

    } catch (error) {

      console.error(`GET ${recurso}:`, error);

      res.status(500).json({ mensaje: `No fue posible consultar ${recurso}. Si es la primera ejecución, reinicia el esquema desde el endpoint indicado en README.` });

    }

  });

  router.post(`/api/${recurso}`, async (req, res) => {

    try {

      const body = req.body || {};

      const faltantes = cfg.obligatorios.filter(c => body[c] === undefined || body[c] === null || String(body[c]).trim() === '');

      if (faltantes.length) return res.status(400).json({ mensaje: `Campos obligatorios: ${faltantes.join(', ')}` });

      if (['productos','servicios','pagos'].includes(recurso) && (!Number.isFinite(Number(body.precio ?? body.valor_pagado)) || Number(body.precio ?? body.valor_pagado) < 0)) return res.status(400).json({ mensaje: 'El valor debe ser un número igual o mayor que cero' });

      const fields = cfg.campos.filter(c => body[c] !== undefined);

      const values = fields.map(c => body[c] === '' ? null : body[c]);

      const [result] = await pool.query(`INSERT INTO ${cfg.tabla} (${fields.join(',')}) VALUES (${fields.map(()=>'?').join(',')})`, values);

      const [rows] = await pool.query(`SELECT * FROM ${cfg.tabla} WHERE ${cfg.id}=?`, [result.insertId]);

      res.status(201).json(rows[0]);

    } catch (error) {

      console.error(`POST ${recurso}:`, error);

      res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ mensaje: error.code === 'ER_DUP_ENTRY' ? 'Ya existe un registro con ese identificador.' : `No fue posible crear el registro de ${recurso}.` });

    }

  });

  router.put(`/api/${recurso}/:id`, async (req, res) => {

    try {

      const body = req.body || {};

      const fields = cfg.campos.filter(c => body[c] !== undefined);

      if (!fields.length) return res.status(400).json({ mensaje: 'No hay campos para actualizar' });

      const [result] = await pool.query(`UPDATE ${cfg.tabla} SET ${fields.map(c=>`${c}=?`).join(',')} WHERE ${cfg.id}=?`, [...fields.map(c=>body[c] === '' ? null : body[c]), req.params.id]);

      if (!result.affectedRows) return res.status(404).json({ mensaje: 'Registro no encontrado' });

      const [rows] = await pool.query(`SELECT * FROM ${cfg.tabla} WHERE ${cfg.id}=?`, [req.params.id]);

      res.json(rows[0]);

    } catch (error) {

      console.error(`PUT ${recurso}:`, error);

      res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ mensaje: error.code === 'ER_DUP_ENTRY' ? 'El identificador ya está registrado.' : 'No fue posible actualizar el registro.' });

    }

  });

  router.delete(`/api/${recurso}/:id`, async (req, res) => {

    try {

      const [result] = await pool.query(`DELETE FROM ${cfg.tabla} WHERE ${cfg.id}=?`, [req.params.id]);

      if (!result.affectedRows) return res.status(404).json({ mensaje: 'Registro no encontrado' });

      res.json({ mensaje: 'Registro eliminado correctamente' });

    } catch (error) {

      console.error(`DELETE ${recurso}:`, error);

      res.status(error.code === 'ER_ROW_IS_REFERENCED_2' ? 409 : 500).json({ mensaje: error.code === 'ER_ROW_IS_REFERENCED_2' ? 'No se puede eliminar: el registro está relacionado con facturas u otros datos.' : 'No fue posible eliminar el registro.' });

    }

  });

}
module.exports = router;
