# Visión de Producto y Matriz de Decisiones (PM)

## Problema de Negocio
La pérdida de mascotas genera altos niveles de estrés en las familias. Las soluciones tradicionales (placas grabadas) solo ofrecen un número telefónico visible y requieren que la persona llame manualmente. 

## Propuesta de Valor (MVP)
Un sistema de alertas en dos niveles vía WebApp (PWA) que combina la facilidad del escaneo QR/NFC sin requerir que la persona que encuentra a la mascota instale ninguna aplicación.

## Decisiones Técnicas y Trade-Offs de Gestión
* **QR vs. NFC exclusivo:** Se priorizó la generación de códigos QR para el MVP para maximizar el *Time-to-Market* y asegurar 100% de compatibilidad con cualquier dispositivo móvil.
* **Patrón Transporter-on-Demand:** Se implementó la recreación del transporte SMTP por petición para asegurar un SLA de entrega del 99.9% en entornos Serverless (Render) evitando sockets colgados.