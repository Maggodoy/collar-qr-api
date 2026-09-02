let userLocation = null;
let isCurrentlyLost = false;

// Extraer el UUID de la mascota desde la URL
function getPetIdFromURL() {
  const path = window.location.pathname;
  // Busca un patrón de UUID v4 en cualquier parte de la ruta (ej: f1855185-c30f-4f72-825c-71af98b2c0b7)
  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
  const match = path.match(uuidRegex);

  if (match) {
    return match[0];
  }

  // Fallback: extrae el último segmento de la URL ignorando slashes finales
  const cleanPath = path.replace(/\/+$/, '');
  const segments = cleanPath.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  if (lastSegment && lastSegment !== 'pets' && lastSegment !== 'index.html') {
    return lastSegment;
  }

  return null;
}

const petId = getPetIdFromURL();

async function cargarMascota() {
  try {
    if (!petId) {
      throw new Error('No se especificó un ID de mascota en la URL.');
    }

    const response = await fetch(`/pets/api/${petId}`);
    if (!response.ok) {
      throw new Error(`Error en la respuesta del servidor (${response.status})`);
    }

    const pet = await response.json();
    isCurrentlyLost = pet.is_lost || false;

    actualizarUIBanner(isCurrentlyLost);

    // Actualizar interfaz con los datos recibidos
    document.getElementById('pet-name').textContent = pet.name || pet.nombre || 'Sin nombre';
    document.getElementById('pet-medical').textContent = pet.medical_info || 'Sin datos médicos registrados';
    document.getElementById('pet-phone').textContent = pet.contact_phone || 'No disponible';

    // Acción del botón WhatsApp
    const btnAlerta = document.getElementById('btn-alerta');
    if (btnAlerta && pet.contact_phone) {
      btnAlerta.onclick = () => {
        const cleanPhone = pet.contact_phone.replace(/\D/g, '');
        let textoMensaje = `¡Hola! Encontré a tu mascota ${pet.name || pet.nombre}.`;

        if (userLocation) {
          textoMensaje += ` Mi ubicación actual en Google Maps es: https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}`;
        } else {
          textoMensaje += ` (No pude compartir mi ubicación GPS automática).`;
        }

        const mensaje = encodeURIComponent(textoMensaje);
        window.open(`https://wa.me/${cleanPhone}?text=${mensaje}`, '_blank');
      };
    }

    // Acción del botón Cambiar Estado (Perdida / Encontrada)
    const btnToggleLost = document.getElementById('btn-toggle-lost');
    if (btnToggleLost) {
      btnToggleLost.onclick = async () => {
        const nuevoEstado = !isCurrentlyLost;
        const confirmacion = confirm(nuevoEstado
          ? '¿Estás seguro de que querés marcar esta mascota como PERDIDA?'
          : '¿Querés marcar esta mascota como ENCONTRADA / A SALVO?'
        );

        if (!confirmacion) return;

        try {
          const res = await fetch(`/pets/${petId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_lost: nuevoEstado })
          });

          if (res.ok) {
            isCurrentlyLost = nuevoEstado;
            actualizarUIBanner(isCurrentlyLost);
            alert(isCurrentlyLost ? 'Mascota reportada como perdida' : 'Estado de mascota actualizado');
          } else {
            alert('No se pudo actualizar el estado de la mascota.');
          }
        } catch (err) {
          console.error('Error al cambiar estado:', err);
          alert('Error de conexión al intentar cambiar el estado.');
        }
      };
    }

  } catch (error) {
    console.error('Error al cargar la mascota:', error);
    const nameElem = document.getElementById('pet-name');
    if (nameElem) {
      if (!petId) {
        nameElem.textContent = 'Mascota no especificada';
      } else {
        nameElem.textContent = 'Error al cargar los datos';
      }
    }
  }
}

function actualizarUIBanner(isLost) {
  const statusBanner = document.getElementById('status-banner');
  const btnToggleLost = document.getElementById('btn-toggle-lost');

  if (statusBanner) {
    if (isLost) {
      statusBanner.innerHTML = `
        <div style="background-color: #ffebe9; color: #c0392b; border: 1px solid #f5c6cb; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-weight: bold; text-align: center;">
          🚨 ¡ESTA MASCOTA ESTÁ PERDIDA!
        </div>
      `;
    } else {
      statusBanner.innerHTML = '';
    }
  }

  if (btnToggleLost) {
    btnToggleLost.textContent = isLost ? '✅ MARCAR COMO ENCONTRADA' : '🚨 REPORTAR COMO PERDIDA';
  }
}

// Captura y envío silencioso de GPS si petId es válido
if ('geolocation' in navigator && petId) {
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      try {
        await fetch('/pets/scans/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pet_id: petId,
            latitude: userLocation.lat,
            longitude: userLocation.lng
          })
        });
      } catch (err) {
        console.error('Error al enviar ubicación al servidor:', err);
      }
    },
    (error) => console.warn('Acceso a ubicación no permitido o denegado por el usuario.'),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// Ejecutar carga inicial
cargarMascota();