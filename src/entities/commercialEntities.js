const entidadesComerciales = {

  clientes: { tabla: 'cliente', id: 'id_cliente', campos: ['documento','nombres','apellidos','telefono','correo','direccion'], obligatorios: ['documento','nombres','apellidos','telefono','correo','direccion'] },

  empleados: { tabla: 'empleado', id: 'id_empleado', campos: ['documento','nombres','apellidos','tipo_personal','cargo','telefono','correo'], obligatorios: ['documento','nombres','apellidos','tipo_personal','cargo','telefono','correo'] },

  productos: { tabla: 'producto', id: 'id_producto', campos: ['nombre','descripcion','precio','stock','id_proveedor','categoria'], obligatorios: ['nombre','precio','stock'] },

  servicios: { tabla: 'servicio', id: 'id_servicio', campos: ['nombre','descripcion','precio'], obligatorios: ['nombre','precio'] },

  proveedores: { tabla: 'proveedor', id: 'id_proveedor', campos: ['nit','nombre','contacto','telefono','correo','direccion'], obligatorios: ['nit','nombre','telefono','correo'] },

  pagos: { tabla: 'pago', id: 'id_pago', campos: ['fecha_pago','metodo_pago','valor_pagado','id_factura'], obligatorios: ['fecha_pago','metodo_pago','valor_pagado','id_factura'] }

};
module.exports = entidadesComerciales;
