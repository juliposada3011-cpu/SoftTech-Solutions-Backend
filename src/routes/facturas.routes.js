const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/api/facturas', async (_req, res) => {
  try {
    const sql = `
      SELECT
        f.*,
        CONCAT(c.nombres, ' ', c.apellidos) AS cliente,
        CONCAT(e.nombres, ' ', e.apellidos) AS empleado,
        COALESCE(di.cantidad_items, 0) AS cantidad_items
      FROM factura AS f
      INNER JOIN cliente AS c ON c.id_cliente = f.id_cliente
      INNER JOIN empleado AS e ON e.id_empleado = f.id_empleado
      LEFT JOIN (
        SELECT id_factura, COUNT(*) AS cantidad_items
        FROM detalle_factura
        GROUP BY id_factura
      ) AS di ON di.id_factura = f.id_factura
      ORDER BY f.id_factura DESC
    `;

    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (error) {
    console.error('GET facturas:', error);
    res.status(500).json({ mensaje: 'No fue posible consultar facturas' });
  }
});

router.get('/api/facturas/:id', async (req, res) => {

  try {

    const [facturas] = await pool.query(`SELECT f.*, CONCAT(c.nombres,' ',c.apellidos) AS cliente, CONCAT(e.nombres,' ',e.apellidos) AS empleado FROM factura f JOIN cliente c ON c.id_cliente=f.id_cliente JOIN empleado e ON e.id_empleado=f.id_empleado WHERE f.id_factura=?`, [req.params.id]);

    if (!facturas.length) return res.status(404).json({ mensaje: 'Factura no encontrada' });

    const [detalles] = await pool.query(`SELECT d.*, p.nombre AS producto, s.nombre AS servicio FROM detalle_factura d LEFT JOIN producto p ON p.id_producto=d.id_producto LEFT JOIN servicio s ON s.id_servicio=d.id_servicio WHERE d.id_factura=?`, [req.params.id]);

    res.json({ ...facturas[0], detalles });

  } catch (error) { console.error('GET factura:', error); res.status(500).json({ mensaje: 'No fue posible consultar la factura' }); }

});

router.post('/api/facturas', async (req, res) => {

  const conn = await pool.getConnection();

  try {

    const { fecha, id_cliente, id_empleado, impuesto = 0, items = [] } = req.body || {};

    if (!fecha || !id_cliente || !id_empleado || !Array.isArray(items) || !items.length) return res.status(400).json({ mensaje: 'Selecciona fecha, cliente, vendedor y al menos un producto o servicio.' });

    await conn.beginTransaction();

    const [vendedoresValidos] = await conn.query(
      "SELECT id_empleado FROM empleado WHERE id_empleado = ? AND tipo_personal = 'Vendedor' LIMIT 1",
      [id_empleado]
    );
    if (!vendedoresValidos.length) throw new Error('Selecciona un registro identificado como vendedor para la factura.');

    let subtotal = 0;

    const lineas = [];

    for (const item of items) {

      const cantidad = Number(item.cantidad);

      if (!Number.isInteger(cantidad) || cantidad < 1) throw new Error('La cantidad debe ser un entero mayor que cero.');

      let precio, id_producto = null, id_servicio = null;

      if (item.tipo === 'servicio') {

        const [rows] = await conn.query('SELECT precio FROM servicio WHERE id_servicio=?', [item.id]);

        if (!rows.length) throw new Error('Uno de los servicios seleccionados no existe.');

        precio = Number(rows[0].precio); id_servicio = Number(item.id);

      } else {

        const [rows] = await conn.query('SELECT precio, stock FROM producto WHERE id_producto=? FOR UPDATE', [item.id]);

        if (!rows.length) throw new Error('Uno de los productos seleccionados no existe.');

        if (Number(rows[0].stock) < cantidad) throw new Error('Existencias insuficientes para uno de los productos.');

        precio = Number(rows[0].precio); id_producto = Number(item.id);

        await conn.query('UPDATE producto SET stock=stock-? WHERE id_producto=?', [cantidad, item.id]);

      }

      const parcial = Math.round(precio * cantidad * 100) / 100;

      subtotal += parcial; lineas.push({ cantidad, precio, parcial, id_producto, id_servicio });

    }

    subtotal = Math.round(subtotal * 100) / 100;

    const valorImpuesto = Number(impuesto);

    if (!Number.isFinite(valorImpuesto) || valorImpuesto < 0) throw new Error('El impuesto debe ser cero o mayor.');

    const total = Math.round((subtotal + valorImpuesto) * 100) / 100;

    const [result] = await conn.query('INSERT INTO factura (fecha, subtotal, impuesto, total, id_cliente, id_empleado) VALUES (?,?,?,?,?,?)', [fecha, subtotal, valorImpuesto, total, id_cliente, id_empleado]);

    for (const l of lineas) await conn.query('INSERT INTO detalle_factura (cantidad, precio_unitario, subtotal, id_factura, id_producto, id_servicio) VALUES (?,?,?,?,?,?)', [l.cantidad, l.precio, l.parcial, result.insertId, l.id_producto, l.id_servicio]);

    await conn.commit();

    res.status(201).json({ mensaje: 'Factura creada correctamente', id_factura: result.insertId, subtotal, impuesto: valorImpuesto, total });

  } catch (error) {

    await conn.rollback(); console.error('POST factura:', error);

    res.status(400).json({ mensaje: error.message || 'No fue posible crear la factura.' });

  } finally { conn.release(); }

});

router.put('/api/facturas/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const idFactura = Number(req.params.id);
    const { fecha, id_cliente, id_empleado, impuesto = 0, items = [] } = req.body || {};
    if (!Number.isInteger(idFactura) || idFactura <= 0) return res.status(400).json({ mensaje: 'Identificador de factura inválido.' });
    if (!fecha || !id_cliente || !id_empleado || !Array.isArray(items) || !items.length) return res.status(400).json({ mensaje: 'Selecciona fecha, cliente, vendedor y al menos un producto o servicio.' });
    const valorImpuesto = Number(impuesto);
    if (!Number.isFinite(valorImpuesto) || valorImpuesto < 0) return res.status(400).json({ mensaje: 'El impuesto debe ser cero o mayor.' });

    await conn.beginTransaction();
    const [facturasExistentes] = await conn.query('SELECT id_factura FROM factura WHERE id_factura=? FOR UPDATE', [idFactura]);
    if (!facturasExistentes.length) { await conn.rollback(); return res.status(404).json({ mensaje: 'Factura no encontrada.' }); }
    const [vendedoresValidos] = await conn.query("SELECT id_empleado FROM empleado WHERE id_empleado=? AND tipo_personal='Vendedor' LIMIT 1", [id_empleado]);
    if (!vendedoresValidos.length) throw new Error('Selecciona un registro identificado como vendedor para la factura.');

    // Restaurar temporalmente las existencias consumidas por la versión anterior de la factura.
    const [detallesAnteriores] = await conn.query('SELECT id_producto, cantidad FROM detalle_factura WHERE id_factura=? AND id_producto IS NOT NULL', [idFactura]);
    for (const detalle of detallesAnteriores) await conn.query('UPDATE producto SET stock=stock+? WHERE id_producto=?', [detalle.cantidad, detalle.id_producto]);

    let subtotal = 0;
    const lineas = [];
    for (const item of items) {
      const cantidad = Number(item.cantidad);
      const idItem = Number(item.id);
      if (!Number.isInteger(cantidad) || cantidad < 1 || !Number.isInteger(idItem) || idItem <= 0) throw new Error('Cada artículo debe tener un elemento válido y una cantidad entera mayor que cero.');
      let precio, id_producto = null, id_servicio = null;
      if (item.tipo === 'servicio') {
        const [rows] = await conn.query('SELECT precio FROM servicio WHERE id_servicio=?', [idItem]);
        if (!rows.length) throw new Error('Uno de los servicios seleccionados no existe.');
        precio = Number(rows[0].precio); id_servicio = idItem;
      } else if (item.tipo === 'producto') {
        const [rows] = await conn.query('SELECT precio, stock FROM producto WHERE id_producto=? FOR UPDATE', [idItem]);
        if (!rows.length) throw new Error('Uno de los productos seleccionados no existe.');
        if (Number(rows[0].stock) < cantidad) throw new Error('Existencias insuficientes para uno de los productos.');
        precio = Number(rows[0].precio); id_producto = idItem;
        await conn.query('UPDATE producto SET stock=stock-? WHERE id_producto=?', [cantidad, idItem]);
      } else {
        throw new Error('Tipo de artículo no válido.');
      }
      const parcial = Math.round(precio * cantidad * 100) / 100;
      subtotal += parcial;
      lineas.push({ cantidad, precio, parcial, id_producto, id_servicio });
    }
    subtotal = Math.round(subtotal * 100) / 100;
    const total = Math.round((subtotal + valorImpuesto) * 100) / 100;
    await conn.query('UPDATE factura SET fecha=?, subtotal=?, impuesto=?, total=?, id_cliente=?, id_empleado=? WHERE id_factura=?', [fecha, subtotal, valorImpuesto, total, id_cliente, id_empleado, idFactura]);
    await conn.query('DELETE FROM detalle_factura WHERE id_factura=?', [idFactura]);
    for (const linea of lineas) await conn.query('INSERT INTO detalle_factura (cantidad, precio_unitario, subtotal, id_factura, id_producto, id_servicio) VALUES (?,?,?,?,?,?)', [linea.cantidad, linea.precio, linea.parcial, idFactura, linea.id_producto, linea.id_servicio]);
    await conn.commit();
    res.json({ mensaje: 'Factura actualizada correctamente', id_factura: idFactura, subtotal, impuesto: valorImpuesto, total });
  } catch (error) {
    await conn.rollback();
    console.error('PUT factura:', error);
    res.status(400).json({ mensaje: error.message || 'No fue posible actualizar la factura.' });
  } finally {
    conn.release();
  }
});

router.delete('/api/facturas/:id', async (req, res) => {

  const conn = await pool.getConnection();

  try {

    await conn.beginTransaction();

    const [items] = await conn.query('SELECT id_producto, cantidad FROM detalle_factura WHERE id_factura=? AND id_producto IS NOT NULL', [req.params.id]);

    for (const item of items) await conn.query('UPDATE producto SET stock=stock+? WHERE id_producto=?', [item.cantidad, item.id_producto]);

    await conn.query('DELETE FROM pago WHERE id_factura=?', [req.params.id]);

    await conn.query('DELETE FROM detalle_factura WHERE id_factura=?', [req.params.id]);

    const [result] = await conn.query('DELETE FROM factura WHERE id_factura=?', [req.params.id]);

    if (!result.affectedRows) { await conn.rollback(); return res.status(404).json({ mensaje: 'Factura no encontrada' }); }

    await conn.commit(); res.json({ mensaje: 'Factura eliminada y existencias restauradas' });

  } catch (error) { await conn.rollback(); console.error('DELETE factura:', error); res.status(500).json({ mensaje: 'No fue posible eliminar la factura' }); }

  finally { conn.release(); }

});

module.exports = router;
