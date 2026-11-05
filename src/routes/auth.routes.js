const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const pool = require('../config/database');

router.post('/api/auth/login', async (req, res) => {

    try {

        const { usuario, contrasena } = req.body;



        if (!usuario || !contrasena) {

            return res.status(400).json({

                mensaje: 'El usuario y la contraseña son obligatorios'

            });

        }



        
const sqlLogin = 'SELECT id_usuario, nombre, apellidos, cedula, fecha_nacimiento, correo, contrasena, rol, estado, fecha_registro FROM usuario WHERE nombre = ? OR correo = ? LIMIT 1';

const [usuarios] = await pool.query(
    sqlLogin,
    [usuario.trim(), usuario.trim()]
);




        if (usuarios.length === 0) {

            return res.status(401).json({

                mensaje: 'Usuario o contraseña incorrectos'

            });

        }



        const user = usuarios[0];



        if (user.estado === 'Inactivo') {

            return res.status(403).json({

                mensaje: 'El usuario se encuentra inactivo'

            });

        }



        const contraseñaCorrecta = await bcrypt.compare(

            contrasena,

            user.contrasena

        );



        if (!contraseñaCorrecta) {

            return res.status(401).json({

                mensaje: 'Usuario o contraseña incorrectos'

            });

        }



        res.json({

            mensaje: 'Inicio de sesión exitoso',

            usuario: {

                id_usuario: user.id_usuario,

                nombre: user.nombre,

                apellidos: user.apellidos,

                cedula: user.cedula,

                fecha_nacimiento: user.fecha_nacimiento,

                correo: user.correo,

                rol: user.rol,

                estado: user.estado,

                fecha_registro: user.fecha_registro

            }

        });



    } catch (error) {

        console.error('Error en el login:', error);



        res.status(500).json({

            mensaje: 'Error interno del servidor'

        });

    }

});



// ========================================

// REGISTRO PÚBLICO

// ========================================




// ========================================
// RECUPERACIÓN SEGURA DE CONTRASEÑA
// ========================================
router.post('/api/auth/solicitar-recuperacion', async (req, res) => {
  try {
    const correo = String(req.body?.correo || '').trim().toLowerCase();
    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return res.status(400).json({ mensaje: 'Ingresa un correo electrónico válido.' });
    }
    const [usuarios] = await pool.query(
      'SELECT id_usuario, correo FROM usuario WHERE LOWER(correo) = ? LIMIT 1', [correo]
    );
    if (usuarios.length > 0) {
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return res.status(503).json({ mensaje: 'La recuperación por correo aún no está configurada. Configura SMTP en el backend.' });
      }
      await pool.query('CREATE TABLE IF NOT EXISTS password_reset_tokens (id INT AUTO_INCREMENT PRIMARY KEY, id_usuario INT NOT NULL, token_hash CHAR(64) NOT NULL UNIQUE, expires_at DATETIME NOT NULL, used TINYINT(1) NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX (id_usuario))');
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const vence = new Date(Date.now() + 30 * 60 * 1000);
      await pool.query('UPDATE password_reset_tokens SET used = 1 WHERE id_usuario = ? AND used = 0', [usuarios[0].id_usuario]);
      await pool.query('INSERT INTO password_reset_tokens (id_usuario, token_hash, expires_at) VALUES (?, ?, ?)', [usuarios[0].id_usuario, tokenHash, vence]);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || 'false') === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?restablecer=${encodeURIComponent(token)}`;
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER, to: usuarios[0].correo,
        subject: 'Recuperación de contraseña - SoftTech Solutions',
        text: `Abre este enlace en los próximos 30 minutos para crear una nueva contraseña: ${resetUrl}. Si no lo solicitaste, ignora este mensaje.`,
        html: `<p>Solicitaste restablecer tu contraseña de SoftTech Solutions.</p><p><a href="${resetUrl}">Crear nueva contraseña</a></p><p>El enlace vence en 30 minutos y solo se puede usar una vez.</p>`
      });
    }
    return res.json({ mensaje: 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.' });
  } catch (error) {
    console.error('Error al solicitar recuperación:', error);
    return res.status(500).json({ mensaje: 'No fue posible procesar la solicitud de recuperación.' });
  }
});

router.post('/api/auth/restablecer-contrasena', async (req, res) => {
  try {
    const token = String(req.body?.token || '');
    const nueva = String(req.body?.nuevaContrasena || '');
    if (!token || nueva.length < 8 || !/[A-Za-z]/.test(nueva) || !/[0-9]/.test(nueva) || !/[^A-Za-z0-9]/.test(nueva)) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres, letras, números y un carácter especial.' });
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [tokens] = await pool.query('SELECT id, id_usuario FROM password_reset_tokens WHERE token_hash = ? AND used = 0 AND expires_at > NOW() LIMIT 1', [tokenHash]);
    if (!tokens.length) return res.status(400).json({ mensaje: 'El enlace venció o ya fue utilizado. Solicita uno nuevo.' });
    const hash = await bcrypt.hash(nueva, 10);
    await pool.query('UPDATE usuario SET contrasena = ? WHERE id_usuario = ?', [hash, tokens[0].id_usuario]);
    await pool.query('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [tokens[0].id]);
    return res.json({ mensaje: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    return res.status(500).json({ mensaje: 'No fue posible restablecer la contraseña.' });
  }
});

router.post('/api/auth/registro', async (req, res) => {

    try {

        const {

            nombre,

            apellidos,

            cedula,

            fecha_nacimiento,

            correo,

            contrasena

        } = req.body;



        if (

            !nombre ||

            !apellidos ||

            !cedula ||

            !fecha_nacimiento ||

            !correo ||

            !contrasena

        ) {

            return res.status(400).json({

                mensaje: 'Todos los campos son obligatorios'

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

                mensaje: 'El correo electrónico ya está registrado'

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

                mensaje: 'La cédula ya está registrada'

            });

        }



        // Encriptar contraseña

        const contrasenaHash = await bcrypt.hash(

            contrasena,

            10

        );



        // Crear usuario

        const [resultado] = await pool.query(

            `INSERT INTO usuario

            (

                nombre,

                apellidos,

                cedula,

                fecha_nacimiento,

                correo,

                contrasena,

                rol

            )

            VALUES (?, ?, ?, ?, ?, ?, ?)`,

            [

                nombre.trim(),

                apellidos.trim(),

                cedula.trim(),

                fecha_nacimiento,

                correo.trim(),

                contrasenaHash,

                'Usuario'

            ]

        );



        res.status(201).json({

            mensaje: 'Usuario registrado correctamente',

            usuario: {

                id_usuario: resultado.insertId,

                nombre: nombre.trim(),

                apellidos: apellidos.trim(),

                cedula: cedula.trim(),

                fecha_nacimiento,

                correo: correo.trim(),

                rol: 'Usuario',

                estado: 'Activo'

            }

        });



    } catch (error) {

        console.error('Error en el registro:', error);



        res.status(500).json({

            mensaje: 'Error interno del servidor'

        });

    }

});



module.exports = router;
