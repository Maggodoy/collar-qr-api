Collar QR / Pet Tracker SaaS 🐾
Plataforma SaaS multiusuario desarrollada para el seguimiento y gestión de mascotas mediante códigos QR y etiquetas NFC, optimizada con un diseño minimalista móvil y alertas de ubicación GPS en tiempo real.

🚀 Características Principales
Autenticación Segura: Sistema de registro e inicio de sesión con JWT y contraseñas cifradas con bcryptjs.

Gestión Multiusuario: Cada usuario gestiona su propia lista de mascotas de forma independiente mediante un panel de control privado.

Alertas Personalizadas: Configuración de múltiples correos de notificación específicos por cada mascota para las alertas de escaneo.

Códigos QR Dinámicos: Generación automática de códigos QR únicos vinculados a la ruta de escaneo de cada animal.

Geolocalización: Captura de coordenadas GPS al escanear el collar y envío instantáneo de alertas por correo electrónico con enlace directo a Google Maps.

🛠️ Tecnologías Utilizadas
Backend: Node.js, Express

Base de Datos: PostgreSQL

Seguridad: JSON Web Tokens (JWT), bcryptjs

Utilidades: qrcode, nodemailer

Frontend: HTML5, CSS (Diseño Japandi), JavaScript vainilla con persistencia en localStorage

⚙️ Configuración de Variables de Entorno
Creá un archivo .env en la raíz del proyecto basándote en la siguiente estructura:

Fragmento de código
PORT=3000
DATABASE_URL=tu_conexion_postgresql
JWT_SECRET=tu_secreto_jwt
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicacion
BASE_URL=https://tu-dominio.onrender.com
📦 Instalación y Ejecución Local
Clonar el repositorio:

Bash
git clone https://github.com/tu-usuario/tu-repositorio.git
cd Collares
Instalar las dependencias:

Bash
npm install
Iniciar el servidor localmente:

Bash
node index.js
