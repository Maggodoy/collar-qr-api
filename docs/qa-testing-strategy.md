# 🧪 Plan de Pruebas (QA Strategy & Test Cases)

Este documento detalla la estrategia de Aseguramiento de la Calidad (QA), la matriz de casos de prueba (manuales y de integración) y la cobertura de endpoints del sistema **Collar QR / Pet Tracker SaaS**.

---

## 🎯 Alcance del Testing

* **Pruebas de API & Integración:** Validación de respuestas HTTP, códigos de estado, estructuras JSON y middlewares de autenticación (JWT).
* **Pruebas Funcionales E2E:** Flujo completo desde el registro de usuario hasta la captura de geolocalización al escanear el QR.
* **Pruebas de Resiliencia / Edge Cases:** Comportamiento ante fallos de correo, coordenadas inválidas o tokens expirados.

---

## 📊 Matriz de Casos de Prueba (Test Cases)

| ID | Módulo | Descripción / Escenario | Pasos / Input | Resultado Esperado | Prioridad |
|---|---|---|---|---|---|
| **TC-01** | Auth | Registro de usuario exitoso | `POST /api/auth/register` con email/pass válidos. | Status `201 Created`. Retorna token JWT. | Alta |
| **TC-02** | Auth | Intento de login con credenciales inválidas | `POST /api/auth/login` con clave incorrecta. | Status `401 Unauthorized`. Mensaje de error claro. | Alta |
| **TC-03** | Pets | Creación de mascota sin token | `POST /api/pets` sin encabezado `Authorization`. | Status `401 Unauthorized` / `403 Forbidden`. | Alta |
| **TC-04** | Pets | Generación de código QR dinámico | `GET /api/pets/:id/qr` con ID existente. | Status `200 OK`. Response Content-Type: `image/png`. | Media |
| **TC-05** | Scan | Escaneo público e impacto en BD (IP Alert) | `GET /pets/:id` desde cliente público. | Status `200 OK`. Crea registro en tabla `scans` y despacha mail SMTP. | Crítica |
| **TC-06** | GPS | Envío de coordenadas GPS válidas | `POST /scans/location` con `lat`, `lng` y `scan_id`. | Status `200 OK`. Actualiza `scans` y envía mail con link a Google Maps. | Crítica |
| **TC-07** | GPS | Envío de coordenadas GPS corruptas | `POST /scans/location` con `lat` fuera de rango o `null`. | Status `400 Bad Request`. No rompe la aplicación. | Media |

---

## 🛠️ Herramientas de Testing Utilizadas

* **Postman / Bruno / Insomnia:** Para la ejecución manual y suites de integración de los endpoints API.
* **Jest + Supertest:** Framework para la automatización de pruebas unitarias y de integración en Node.js.
* **PostgreSQL (Test DB):** Base de datos en memoria/aislada para garantizar la idempotencia de las ejecuciones.

---

## 🚀 Ejecución de Pruebas Automatizadas

Para correr la suite de pruebas unitarias y de integración localmente:

```bash
# Ejecutar tests con reporte
npm test