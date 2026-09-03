# Historias de Usuario (User Stories) & Criterios de Aceptación

## US-01: Registro de Mascota
**Como** dueño de una mascota  
**Quiero** registrar a mi mascota con sus datos de contacto y mails de notificación  
**Para que** el sistema genere una ficha accesible por QR y me notifique en caso de extravío.

### Criterios de Aceptación:
* El formulario debe validar que el nombre y teléfono no estén vacíos.
* Permite ingresar múltiples casillas de email separadas por comas.
* Al guardar, debe retornar los datos confirmados y permitir la generación dinámica del QR.

---

## US-02: Notificación Inmediata por Escaneo (Filtro Anti-Pérdida)
**Como** dueño de una mascota registrada  
**Quiero** recibir un correo electrónico inmediato cuando alguien escanee la chapita  
**Para** saber al instante que alguien encontró a mi mascota, incluso si no otorga permisos de GPS.

### Criterios de Aceptación:
* Al hacer `GET /pets/:id`, se debe capturar la IP pública del cliente y el User-Agent.
* Se debe disparar un correo con formato HTML con fecha, hora e IP capturada.
* El proceso de envío de mail debe ser asíncrono para no demorar la carga de la vista pública.

---

## US-03: Notificación de Geolocalización Precisa
**Como** dueño de una mascota perdida  
**Quiero** recibir las coordenadas GPS exactas en mi e-mail  
**Para** ver la ubicación en Google Maps e ir a buscarla.

### Criterios de Aceptación:
* Si el usuario acepta la solicitud de ubicación en el navegador, se realiza un `POST /scans/location`.
* Se envía un segundo correo con la URL directa a Google Maps (`https://maps.google.com/?q=lat,lng`).