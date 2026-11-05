const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/api/informacion', async (req, res) => {

    try {

        const [informacion] = await pool.query(

            `SELECT

                id_informacion,

                titulo,

                descripcion,

                categoria,

                fecha_registro,

                estado

             FROM informacion

             ORDER BY id_informacion DESC`

        );



        res.json(informacion);



    } catch (error) {

        console.error(

            'Error al consultar información:',

            error

        );



        res.status(500).json({

            mensaje:

                'No fue posible consultar la información'

        });

    }

});





// REGISTRAR INFORMACIÓN

router.post('/api/informacion', async (req, res) => {

    try {

        const {

            titulo,

            descripcion,

            categoria,

            fecha_registro,

            estado

        } = req.body;



        if (

            !titulo ||

            !descripcion ||

            !categoria ||

            !fecha_registro ||

            !estado

        ) {

            return res.status(400).json({

                mensaje:

                    'Todos los campos son obligatorios'

            });

        }



        const [resultado] = await pool.query(

            `INSERT INTO informacion

            (

                titulo,

                descripcion,

                categoria,

                fecha_registro,

                estado

            )

            VALUES (?, ?, ?, ?, ?)`,

            [

                titulo.trim(),

                descripcion.trim(),

                categoria.trim(),

                fecha_registro,

                estado

            ]

        );



        res.status(201).json({

            mensaje:

                'Información registrada correctamente',

            informacion: {

                id_informacion: resultado.insertId,

                titulo: titulo.trim(),

                descripcion: descripcion.trim(),

                categoria: categoria.trim(),

                fecha_registro,

                estado

            }

        });



    } catch (error) {

        console.error(

            'Error al registrar información:',

            error

        );



        res.status(500).json({

            mensaje:

                'No fue posible registrar la información'

        });

    }

});





// ACTUALIZAR INFORMACIÓN

router.put('/api/informacion/:id', async (req, res) => {

    try {

        const id = Number(req.params.id);



        const {

            titulo,

            descripcion,

            categoria,

            fecha_registro,

            estado

        } = req.body;



        if (!id) {

            return res.status(400).json({

                mensaje:

                    'ID de información inválido'

            });

        }



        if (

            !titulo ||

            !descripcion ||

            !categoria ||

            !fecha_registro ||

            !estado

        ) {

            return res.status(400).json({

                mensaje:

                    'Todos los campos son obligatorios'

            });

        }



        const [resultado] = await pool.query(

            `UPDATE informacion

             SET

                titulo = ?,

                descripcion = ?,

                categoria = ?,

                fecha_registro = ?,

                estado = ?

             WHERE id_informacion = ?`,

            [

                titulo.trim(),

                descripcion.trim(),

                categoria.trim(),

                fecha_registro,

                estado,

                id

            ]

        );



        if (resultado.affectedRows === 0) {

            return res.status(404).json({

                mensaje:

                    'La información no existe'

            });

        }



        res.json({

            mensaje:

                'Información actualizada correctamente'

        });



    } catch (error) {

        console.error(

            'Error al actualizar información:',

            error

        );



        res.status(500).json({

            mensaje:

                'No fue posible actualizar la información'

        });

    }

});





// ELIMINAR INFORMACIÓN

router.delete('/api/informacion/:id', async (req, res) => {

    try {

        const id = Number(req.params.id);



        if (!id) {

            return res.status(400).json({

                mensaje:

                    'ID de información inválido'

            });

        }



        const [resultado] = await pool.query(

            `DELETE FROM informacion

             WHERE id_informacion = ?`,

            [id]

        );



        if (resultado.affectedRows === 0) {

            return res.status(404).json({

                mensaje:

                    'La información no existe'

            });

        }



        res.json({

            mensaje:

                'Información eliminada correctamente'

        });



    } catch (error) {

        console.error(

            'Error al eliminar información:',

            error

        );



        res.status(500).json({

            mensaje:

                'No fue posible eliminar la información'

        });


    }
});
module.exports = router;
