const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/api/reportes', async (req, res) => {

    try {



        const {

            tipo,

            fecha_inicio,

            fecha_fin

        } = req.query;



        let consulta = `

            SELECT

                r.id_reporte,

                r.nombre_reporte,

                r.tipo_reporte,

                r.fecha_generacion,

                r.descripcion,

                r.estado,

                r.id_usuario,

                CONCAT(

                    COALESCE(u.nombre, ''),

                    CASE

                        WHEN COALESCE(u.apellidos, '') <> ''

                        THEN CONCAT(' ', u.apellidos)

                        ELSE ''

                    END

                ) AS generado_por



            FROM reporte r



            LEFT JOIN usuario u

                ON u.id_usuario = r.id_usuario



            WHERE 1 = 1

        `;



        const parametros = [];



        // FILTRO POR TIPO

        if (tipo && tipo !== 'Todos') {



            consulta += `

                AND r.tipo_reporte = ?

            `;



            parametros.push(tipo);

        }



        // FILTRO FECHA INICIO

        if (fecha_inicio) {



            consulta += `

                AND DATE(r.fecha_generacion) >= ?

            `;



            parametros.push(fecha_inicio);

        }



        // FILTRO FECHA FIN

        if (fecha_fin) {



            consulta += `

                AND DATE(r.fecha_generacion) <= ?

            `;



            parametros.push(fecha_fin);

        }



        consulta += `

            ORDER BY r.id_reporte DESC

        `;



        const [reportes] =

            await pool.query(

                consulta,

                parametros

            );



        res.json(reportes);



    } catch (error) {



        console.error(

            'Error al consultar reportes:',

            error

        );



        res.status(500).json({

            mensaje:

                'No fue posible consultar los reportes'

        });

    }

});





// ========================================

// GENERAR REPORTE

// ========================================



router.post('/api/reportes', async (req, res) => {



    try {



        const {

            nombre_reporte,

            tipo_reporte,

            descripcion,

            estado,

            id_usuario

        } = req.body;





        // VALIDAR CAMPOS

        if (

            !nombre_reporte ||

            !tipo_reporte

        ) {



            return res.status(400).json({

                mensaje:

                    'El nombre y el tipo de reporte son obligatorios'

            });

        }





        // OBTENER USUARIO

        let usuarioId =

            Number(id_usuario);





        if (

            !Number.isInteger(usuarioId) ||

            usuarioId <= 0

        ) {



            const [usuarios] =

                await pool.query(`

                    SELECT id_usuario

                    FROM usuario

                    WHERE estado = 'Activo'

                    ORDER BY id_usuario ASC

                    LIMIT 1

                `);





            if (usuarios.length === 0) {



                return res.status(400).json({

                    mensaje:

                        'No existe un usuario activo para asociar el reporte'

                });

            }





            usuarioId =

                usuarios[0].id_usuario;

        }





        // ESTADOS PERMITIDOS

        const estadosPermitidos = [

            'Finalizado',

            'En proceso',

            'Inactivo'

        ];





        const estadoFinal =

            estadosPermitidos.includes(estado)

                ? estado

                : 'Finalizado';





        // INSERTAR REPORTE

        const [resultado] =

            await pool.query(

                `

                INSERT INTO reporte

                (

                    nombre_reporte,

                    tipo_reporte,

                    fecha_generacion,

                    descripcion,

                    estado,

                    id_usuario

                )



                VALUES (?, ?, NOW(), ?, ?, ?)

                `,

                [

                    nombre_reporte.trim(),

                    tipo_reporte.trim(),

                    descripcion

                        ? descripcion.trim()

                        : null,

                    estadoFinal,

                    usuarioId

                ]

            );





        res.status(201).json({



            mensaje:

                'Reporte generado correctamente',



            id_reporte:

                resultado.insertId



        });



    } catch (error) {



        console.error(

            'Error al generar reporte:',

            error

        );



        res.status(500).json({

            mensaje:

                'No fue posible generar el reporte'

        });

    }

});





// ========================================

// ELIMINAR REPORTE

// ========================================



router.delete('/api/reportes/:id', async (req, res) => {



    try {



        const id =

            Number(req.params.id);





        if (

            !Number.isInteger(id) ||

            id <= 0

        ) {



            return res.status(400).json({

                mensaje:

                    'Identificador de reporte inválido'

            });

        }





        const [resultado] =

            await pool.query(

                `

                DELETE FROM reporte

                WHERE id_reporte = ?

                `,

                [id]

            );





        if (

            resultado.affectedRows === 0

        ) {



            return res.status(404).json({

                mensaje:

                    'El reporte no existe'

            });

        }





        res.json({

            mensaje:

                'Reporte eliminado correctamente'

        });



    } catch (error) {



        console.error(

            'Error al eliminar reporte:',

            error

        );



        res.status(500).json({

            mensaje:

                'No fue posible eliminar el reporte'

        });

    }
});
module.exports = router;
