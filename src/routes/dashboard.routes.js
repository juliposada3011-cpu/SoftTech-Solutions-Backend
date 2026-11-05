const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/api/dashboard/estadisticas', async (req, res) => {
    try {
        const contar = async (tabla) => {
            try {
                const [[fila]] = await pool.query(`SELECT COUNT(*) AS total FROM \`${tabla}\``);
                return Number(fila.total) || 0;
            } catch (error) {
                return 0;
            }
        };

        const [usuarios, informacion, reportes, clientes, proveedores, productos, empleados, facturas, pagos] = await Promise.all([
            contar('usuario'), contar('informacion'), contar('reporte'),
            contar('cliente'), contar('proveedor'), contar('producto'),
            contar('empleado'), contar('factura'), contar('pago')
        ]);

        res.json({ usuarios, informacion, reportes, clientes, proveedores, productos, empleados, facturas, pagos });
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        res.status(500).json({ mensaje: 'No fue posible cargar las estadísticas' });
    }

});
module.exports = router;
