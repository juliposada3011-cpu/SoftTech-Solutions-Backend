require('dotenv').config();
const app = require('./src/app');
const prepararEsquemaComercialAlIniciar = require('./src/config/prepareSchema');
const PORT = Number(process.env.PORT || 3000);

async function iniciarServidor() {
  await prepararEsquemaComercialAlIniciar();
  app.listen(PORT, () => {
    console.log(`Servidor SoftTech Solutions ejecutándose en http://localhost:${PORT}`);
  });
}

iniciarServidor().catch((error) => {
  console.error('No fue posible iniciar el servidor:', error);
  process.exit(1);
});
