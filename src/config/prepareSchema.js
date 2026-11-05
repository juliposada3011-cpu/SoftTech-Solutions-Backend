const pool = require('./database');

async function prepararEsquemaComercialAlIniciar() {

    try {

        await pool.query(`
  CREATE TABLE IF NOT EXISTS proveedor (
    id_proveedor INT NOT NULL AUTO_INCREMENT,
    nit VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    contacto VARCHAR(100) NULL,
    telefono VARCHAR(30) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    direccion VARCHAR(200) NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_proveedor)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`);
        // Añadir tipo_personal si falta, conservando los registros existentes.
        const [columnasEmpleado] = await pool.query('SHOW COLUMNS FROM empleado');
        const nombresColumnasEmpleado = columnasEmpleado.map(c => c.Field);
        if (!nombresColumnasEmpleado.includes('tipo_personal')) {
            await pool.query("ALTER TABLE empleado ADD COLUMN tipo_personal ENUM('Empleado','Vendedor') NOT NULL DEFAULT 'Vendedor'");
        }

        const [columnas] = await pool.query('SHOW COLUMNS FROM producto');
        const existentes = columnas.map(c => c.Field);
        if (!existentes.includes('id_proveedor')) await pool.query('ALTER TABLE producto ADD COLUMN id_proveedor INT NULL');

        if (!existentes.includes('categoria')) await pool.query('ALTER TABLE producto ADD COLUMN categoria VARCHAR(100) NULL');

        const [relacion] = await pool.query("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='producto' AND COLUMN_NAME='id_proveedor' AND REFERENCED_TABLE_NAME='proveedor'");

        if (!relacion.length) {

            try { await pool.query('ALTER TABLE producto ADD CONSTRAINT fk_producto_proveedor FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor) ON DELETE SET NULL'); }

            catch (e) { if (e.code !== 'ER_DUP_KEYNAME') throw e; }

        }

        console.log('✓ Esquema comercial verificado');

    } catch (error) {

        console.error('No se pudo preparar el esquema comercial:', error.message);

        console.error('Verifica que MySQL esté iniciado y que la base configurada exista.');

    }

}

module.exports = prepararEsquemaComercialAlIniciar;
