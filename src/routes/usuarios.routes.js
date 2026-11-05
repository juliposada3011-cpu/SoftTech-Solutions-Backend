const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/database');

router.get('/api/usuarios', async (req, res) => {

    try {

        const [usuarios] = await pool.query(

            `SELECT

                id_usuario,

                nombre,

                apellidos,

                cedula,

                fecha_nacimiento,

                correo,

                rol,

                estado,

                fecha_registro

             FROM usuario

             ORDER BY id_usuario DESC`

        );



        res.json(usuarios);



    } catch (error) {

        console.error(

            'Error al listar usuarios:',

            error

        );



        res.status(500).json({

            mensaje:

                'No fue posible consultar los usuarios'

        });

    }

});



// ========================================

// CREAR USUARIO DESDE DASHBOARD

// ========================================



router.post('/api/usuarios', async (req, res) => {

    try {

        const {

            nombre,

            apellidos,

            cedula,

            fecha_nacimiento,

            correo,

            contrasena,

            rol,

            estado

        } = req.body;



        // Validar campos

        if (

            !nombre ||

            !apellidos ||

            !cedula ||

            !fecha_nacimiento ||

            !correo ||

            !contrasena ||

            !rol ||

            !estado

        ) {

            return res.status(400).json({

                mensaje:

                    'Todos los campos son obligatorios'

            });

        }



        // Verificar correo

        const [correoExistente] = await pool.query(

            `SELECT id_usuario

             FROM usuario

             WHERE correo = ?

             LIMIT 1`,

            [correo.trim()]

        );



        if (correoExistente.length > 0) {

            return res.status(409).json({

                mensaje:

                    'El correo electrónico ya está registrado'

            });

        }



        // Verificar cédula

        const [cedulaExistente] = await pool.query(

            `SELECT id_usuario

             FROM usuario

             WHERE cedula = ?

             LIMIT 1`,

            [cedula.trim()]

        );



        if (cedulaExistente.length > 0) {

            return res.status(409).json({

                mensaje:

                    'La cédula ya está registrada'

            });

        }



        // Encriptar contraseña

        const contrasenaHash =

            await bcrypt.hash(contrasena, 10);



        // Insertar

        const [resultado] = await pool.query(

            `INSERT INTO usuario

            (

                nombre,

                apellidos,

                cedula,

                fecha_nacimiento,

                correo,

                contrasena,

                rol,

                estado

            )

            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,

            [

                nombre.trim(),

                apellidos.trim(),

                cedula.trim(),

                fecha_nacimiento,

                correo.trim(),

                contrasenaHash,

                rol,

                estado

            ]

        );



        res.status(201).json({

            mensaje:

                'Usuario creado correctamente',

            usuario: {

                id_usuario: resultado.insertId,

                nombre: nombre.trim(),

                apellidos: apellidos.trim(),

                cedula: cedula.trim(),

                fecha_nacimiento,

                correo: correo.trim(),

                rol,

                estado

            }

        });



    } catch (error) {

        console.error(

            'Error al crear usuario:',

            error

        );



        res.status(500).json({

            mensaje:

                'No fue posible crear el usuario'

        });

    }

});



// ========================================

// ACTUALIZAR USUARIO

// ========================================



router.put('/api/usuarios/:id', async (req, res) => {

    try {

        const id = Number(req.params.id);



        const {

            nombre,

            apellidos,

            cedula,

            fecha_nacimiento,

            correo,

            contrasena,

            rol,

            estado

        } = req.body;



        if (!id) {

            return res.status(400).json({

                mensaje: 'ID de usuario inválido'

            });

        }



        if (

            !nombre ||

            !apellidos ||

            !cedula ||

            !fecha_nacimiento ||

            !correo ||

            !rol ||

            !estado

        ) {

            return res.status(400).json({

                mensaje:

                    'Todos los campos son obligatorios'

            });

        }



        // Verificar correo de otro usuario

        const [correoExistente] = await pool.query(

            `SELECT id_usuario

             FROM usuario

             WHERE correo = ?

             AND id_usuario <> ?

             LIMIT 1`,

            [

                correo.trim(),

                id

            ]

        );



        if (correoExistente.length > 0) {

            return res.status(409).json({

                mensaje:

                    'El correo electrónico ya está registrado'

            });

        }



        // Verificar cédula de otro usuario

        const [cedulaExistente] = await pool.query(

            `SELECT id_usuario

             FROM usuario

             WHERE cedula = ?

             AND id_usuario <> ?

             LIMIT 1`,

            [

                cedula.trim(),

                id

            ]

        );



        if (cedulaExistente.length > 0) {

            return res.status(409).json({

                mensaje:

                    'La cédula ya está registrada'

            });

        }



        // Actualizar con o sin contraseña

        if (contrasena && contrasena.trim()) {



            const contrasenaHash =

                await bcrypt.hash(

                    contrasena,

                    10

                );



            await pool.query(

                `UPDATE usuario

                 SET

                    nombre = ?,

                    apellidos = ?,

                    cedula = ?,

                    fecha_nacimiento = ?,

                    correo = ?,

                    contrasena = ?,

                    rol = ?,

                    estado = ?

                 WHERE id_usuario = ?`,

                [

                    nombre.trim(),

                    apellidos.trim(),

                    cedula.trim(),

                    fecha_nacimiento,

                    correo.trim(),

                    contrasenaHash,

                    rol,

                    estado,

                    id

                ]

            );



        } else {



            await pool.query(

                `UPDATE usuario

                 SET

                    nombre = ?,

                    apellidos = ?,

                    cedula = ?,

                    fecha_nacimiento = ?,

                    correo = ?,

                    rol = ?,

                    estado = ?

                 WHERE id_usuario = ?`,

                [

                    nombre.trim(),

                    apellidos.trim(),

                    cedula.trim(),

                    fecha_nacimiento,

                    correo.trim(),

                    rol,

                    estado,

                    id

                ]

            );

        }



        res.json({

            mensaje:

                'Usuario actualizado correctamente'

        });



    } catch (error) {

        console.error(

            'Error al actualizar usuario:',

            error

        );



        res.status(500).json({

            mensaje:

                'No fue posible actualizar el usuario'

        });

    }

});



// ========================================



// ACTUALIZAR PERFIL DESDE CONFIGURACIÓN



// ========================================



router.put('/api/usuarios/:id/perfil', async (req, res) => {

    try {

        const id = Number(req.params.id);



        const {

            nombre,

            apellidos,

            correo

        } = req.body;



        if (!Number.isInteger(id) || id <= 0) {

            return res.status(400).json({

                mensaje: 'Identificador de usuario inválido'

            });

        }



        if (!nombre || !nombre.trim()) {

            return res.status(400).json({

                mensaje: 'El nombre es obligatorio'

            });

        }



        if (!correo || !correo.trim()) {

            return res.status(400).json({

                mensaje: 'El correo electrónico es obligatorio'

            });

        }



        const [usuarios] = await pool.query(

            `SELECT id_usuario

             FROM usuario

             WHERE id_usuario = ?

             LIMIT 1`,

            [id]

        );



        if (usuarios.length === 0) {

            return res.status(404).json({

                mensaje: 'El usuario no existe'

            });

        }



        const [correoDuplicado] = await pool.query(

            `SELECT id_usuario

             FROM usuario

             WHERE correo = ?

             AND id_usuario <> ?

             LIMIT 1`,

            [

                correo.trim(),

                id

            ]

        );



        if (correoDuplicado.length > 0) {

            return res.status(409).json({

                mensaje: 'El correo electrónico ya está registrado por otro usuario'

            });

        }



        await pool.query(

            `UPDATE usuario

             SET nombre = ?,

                 apellidos = ?,

                 correo = ?

             WHERE id_usuario = ?`,

            [

                nombre.trim(),

                (apellidos || '').trim(),

                correo.trim(),

                id

            ]

        );



        res.json({

            mensaje: 'Perfil actualizado correctamente'

        });



    } catch (error) {



        console.error(

            'Error al actualizar perfil:',

            error

        );



        res.status(500).json({

            mensaje: 'No fue posible actualizar el perfil'

        });

    }

});



// ========================================

// CAMBIAR CONTRASEÑA

// ========================================



router.put('/api/usuarios/:id/cambiar-contrasena', async (req, res) => {

    try {

        const id = Number(req.params.id);



        const {

            contrasenaActual,

            nuevaContrasena

        } = req.body;



        // Validar ID

        if (!Number.isInteger(id) || id <= 0) {

            return res.status(400).json({

                mensaje: 'Identificador de usuario inválido'

            });

        }



        // Validar contraseñas

        if (!contrasenaActual || !nuevaContrasena) {

            return res.status(400).json({

                mensaje: 'La contraseña actual y la nueva contraseña son obligatorias'

            });

        }



        // Mínimo 8 caracteres

        if (nuevaContrasena.length < 8) {

            return res.status(400).json({

                mensaje: 'La nueva contraseña debe tener al menos 8 caracteres'

            });

        }



        // Debe contener una letra

        if (!/[A-Za-z]/.test(nuevaContrasena)) {

            return res.status(400).json({

                mensaje: 'La contraseña debe contener al menos una letra'

            });

        }



        // Debe contener un número

        if (!/[0-9]/.test(nuevaContrasena)) {

            return res.status(400).json({

                mensaje: 'La contraseña debe contener al menos un número'

            });

        }



        // Debe contener un carácter especial

        if (!/[^A-Za-z0-9]/.test(nuevaContrasena)) {

            return res.status(400).json({

                mensaje: 'La contraseña debe contener al menos un carácter especial'

            });

        }



        // Buscar usuario

        const [usuarios] = await pool.query(

            `SELECT id_usuario, contrasena

             FROM usuario

             WHERE id_usuario = ?

             LIMIT 1`,

            [id]

        );



        if (usuarios.length === 0) {

            return res.status(404).json({

                mensaje: 'El usuario no existe'

            });

        }



        const usuario = usuarios[0];



        // Comprobar contraseña actual

        const contraseñaCorrecta = await bcrypt.compare(

            contrasenaActual,

            usuario.contrasena

        );



        if (!contraseñaCorrecta) {

            return res.status(401).json({

                mensaje: 'La contraseña actual es incorrecta'

            });

        }



        // Encriptar nueva contraseña

        const nuevaContrasenaHash = await bcrypt.hash(

            nuevaContrasena,

            10

        );



        // Actualizar contraseña en MySQL

        await pool.query(

            `UPDATE usuario

             SET contrasena = ?

             WHERE id_usuario = ?`,

            [

                nuevaContrasenaHash,

                id

            ]

        );



        res.json({

            mensaje: 'Contraseña actualizada correctamente'

        });



    } catch (error) {



        console.error(

            'Error al cambiar contraseña:',

            error

        );



        res.status(500).json({

            mensaje: 'No fue posible actualizar la contraseña'

        });

    }

});



// ========================================

// ELIMINAR USUARIO

// ========================================



router.delete('/api/usuarios/:id', async (req, res) => {

    try {

        const id = Number(req.params.id);



        if (!id) {

            return res.status(400).json({

                mensaje: 'ID de usuario inválido'

            });

        }



        // Verificar que exista

        const [usuarios] = await pool.query(

            `SELECT id_usuario

             FROM usuario

             WHERE id_usuario = ?

             LIMIT 1`,

            [id]

        );



        if (usuarios.length === 0) {

            return res.status(404).json({

                mensaje:

                    'El usuario no existe'

            });

        }



        await pool.query(

            `DELETE FROM usuario

             WHERE id_usuario = ?`,

            [id]

        );



        res.json({

            mensaje:

                'Usuario eliminado correctamente'

        });



    } catch (error) {

        console.error(

            'Error al eliminar usuario:',

            error

        );



        // Error de clave foránea

        if (error.code === 'ER_ROW_IS_REFERENCED_2') {

            return res.status(409).json({

                mensaje:

                    'No se puede eliminar este usuario porque tiene información relacionada en el sistema.'

            });

        }



        res.status(500).json({

            mensaje:

                'No fue posible eliminar el usuario'

        });

    }

});



module.exports = router;
