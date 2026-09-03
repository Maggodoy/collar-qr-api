# 🐾 Collar QR / Pet Tracker SaaS

Plataforma SaaS multiusuario optimizada para el seguimiento, gestión y localización de mascotas en tiempo real mediante códigos QR, etiquetas NFC y arquitectura PWA.

---

## 📄 Documentación Funcional & Gestión de Producto (PM)
Este proyecto cuenta con una especificación funcional completa y un análisis de ciclo de vida de producto:

* 📋 [Historias de Usuario y Criterios de Aceptación](./docs/user-stories.md)
* 🚀 [Visión de Producto, MVP y KPIs](./docs/product-roadmap.md)

---

## 🚀 Características Principales

* **Autenticación & Seguridad:** Registro e inicio de sesión seguro con JWT (JSON Web Tokens) y contraseñas cifradas mediante `bcryptjs`.
* **Gestión Multiusuario:** Panel de control privado donde cada dueño administra sus mascotas, edita información médica y cambia el estado de extravío ("Perdida / Encontrada").
* **Sincronización PWA (Progressive Web App):** Interfaz móvil instalable en Android e iOS mediante Service Worker y Manifiesto de Aplicación para acceso rápido a la gestión de alertas.
* **Sistema de Notificaciones Dual:**
  1. *Alerta Inmediata por IP:* Captura de dirección IP, dispositivo (User-Agent) y timestamp en el momento exacto del escaneo (`GET /pets/:id`).
  2. *Alerta de Geolocalización Precisa:* Envío de un segundo correo con las coordenadas GPS exactas y enlace a Google Maps si el usuario otorga permisos en el navegador (`POST /scans/location`).
* **Resiliencia de Red:** Conexiones SMTP dinámicas por demanda (*Transporter-on-Demand*) para asegurar la entrega constante de correos en entornos Serverless/PaaS (Render).
* **Generación Dinámica de QR:** Creación automática de códigos QR con la librería `qrcode` vinculados a la ruta de escaneo de cada animal.

---

## 🛠️ Stack Tecnológico

* **Backend:** Node.js, Express.js.
* **Base de Datos:** PostgreSQL.
* **Manejo de Envíos:** Nodemailer (Gmail SMTP con transportes bajo demanda).
* **Autenticación:** JWT, bcryptjs.
* **Frontend / PWA:** HTML5, CSS3 (Diseño estilo Japandi), JavaScript nativo, Service Workers (`sw.js`) y `manifest.json`.
* **Despliegue:** Render.

---

## ⚙️ Configuración de Variables de Entorno

Creá un archivo `.env` en la raíz del proyecto basándote en la siguiente estructura:

```env
PORT=3000
DATABASE_URL=tu_conexion_postgresql
JWT_SECRET=tu_secreto_jwt
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicacion
BASE_URL=https:// collar-qr-api.onrender.com
NOTIFY_EMAIL=correo_fallback_alerta@gmail.com