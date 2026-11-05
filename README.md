# SoftTech Solutions — Backend

Backend REST de SoftTech Solutions, reorganizado en módulos por responsabilidad y funcionalidad. Se conserva Node.js, Express y MySQL para mantener la compatibilidad con el frontend existente.

## Tecnologías
- Node.js y Express 5
- MySQL con mysql2/promise
- bcrypt para hash y verificación de contraseñas
- Nodemailer para recuperación por correo
- dotenv para configuración por variables de entorno

## Arquitectura
```text
backend/
├── src/
│   ├── app.js
│   ├── config/
│   │   ├── database.js
│   │   └── prepareSchema.js
│   ├── entities/
│   │   └── commercialEntities.js
│   ├── middlewares/
│   └── routes/
│       ├── health.routes.js
│       ├── auth.routes.js
│       ├── usuarios.routes.js
│       ├── informacion.routes.js
│       ├── reportes.routes.js
│       ├── dashboard.routes.js
│       ├── comercial.routes.js
│       └── facturas.routes.js
├── database/
├── .env.example
├── .gitignore
├── package.json
└── server.js
```

### Responsabilidades
- `config/`: conexión a MySQL y preparación compatible del esquema comercial.
- `entities/`: definición de entidades y metadatos de campos permitidos para los recursos comerciales.
- `routes/`: endpoints agrupados por módulo funcional.
- `app.js`: configuración de Express, middlewares y montaje de rutas.
- `server.js`: punto de entrada e inicio del servidor.

> Nota de arquitectura: esta primera reorganización separa configuración, entidades y módulos de rutas. Los controladores y servicios de negocio todavía están integrados en los módulos de rutas heredados; se recomienda extraerlos en una segunda iteración sin cambiar los contratos HTTP.

## Instalación
1. Instala Node.js LTS y MySQL.
2. Copia `.env.example` como `.env` y completa los datos reales de tu base de datos y SMTP.
3. Instala dependencias: `npm install`.
4. Ejecuta en desarrollo: `npm run dev`.
5. Ejecuta normalmente: `npm start`.

La API queda disponible por defecto en `http://localhost:3000`.

## Rutas principales
- `GET /` — estado de la API.
- `/api/auth` — inicio de sesión, registro y recuperación de contraseña.
- `/api/usuarios` — gestión de usuarios y perfil.
- `/api/informacion` — CRUD de información.
- `/api/reportes` — consulta, generación y eliminación de reportes.
- `/api/dashboard/estadisticas` — estadísticas del panel.
- `/api/clientes`, `/api/empleados`, `/api/productos`, `/api/servicios`, `/api/proveedores`, `/api/pagos` — recursos comerciales.
- `/api/facturas` — facturación y detalle de factura.
- `POST /api/sistema/preparar-esquema` — preparación manual del esquema comercial.

## Compatibilidad
Se conservaron los paths y los nombres de campos presentes en el backend recibido para reducir cambios necesarios en el frontend. Debe probarse contra la base de datos real antes de desplegar.

## Seguridad antes de publicar
- No subas `.env` ni credenciales al repositorio.
- Configura secretos en el entorno de despliegue.
- Si el `.env` incluido en el ZIP original contenía contraseñas reales, cámbialas antes de publicar.
- Configura CORS para permitir únicamente el origen del frontend en producción.
- Añade autenticación/autorización por roles a las rutas privadas antes de desplegar en internet.
