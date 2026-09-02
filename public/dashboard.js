const token = localStorage.getItem('token');
if (!token) window.location.href = '/login.html';

let mascotasGuardadas = [];

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

async function cargarMascotas() {
  const listContainer = document.getElementById('pets-list');

  try {
    const response = await fetch('/pets/user/all', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Error al conectar con el servidor.');

    mascotasGuardadas = await response.json();

    if (!Array.isArray(mascotasGuardadas)) throw new Error('Respuesta del servidor inválida.');

    if (mascotasGuardadas.length === 0) {
      listContainer.innerHTML = '<p>No tenés mascotas registradas todavía.</p>';
      return;
    }

    listContainer.innerHTML = mascotasGuardadas.map(pet => {
      const isLost = pet.is_lost || false;
      const statusBtnText = isLost ? '✅ Marcar Encontrada' : '🚨 Marcar Perdida';
      const statusBtnClass = isLost ? 'btn-status-found' : 'btn-status-lost';

      return `
        <div class="pet-item">
          <div class="pet-info">
            <strong>${pet.name}</strong> ${isLost ? '🚨 <span style="color:red; font-weight:bold;">(PERDIDA)</span>' : ''}<br>
            <small>📞 ${pet.contact_phone}</small><br>
            <small>✉️ ${pet.notification_emails || 'Sin mails asignados'}</small>
          </div>
          <div class="actions">
            <button class="${statusBtnClass}" onclick="cambiarEstadoPerdida('${pet.id}', ${!isLost})">${statusBtnText}</button>
            <a href="/pets/${pet.id}/qr" target="_blank" class="btn-qr">Ver QR</a>
            <button class="btn-edit" onclick="prepararEdicion('${pet.id}')">Editar</button>
            <button class="btn-delete" onclick="eliminarMascota('${pet.id}')">Borrar</button>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error al cargar mascotas:', err);
    listContainer.innerHTML = '<p style="color: red;">No se pudieron cargar las mascotas.</p>';
  }
}

async function cambiarEstadoPerdida(id, nuevoEstado) {
  try {
    const response = await fetch(`/pets/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ is_lost: nuevoEstado })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Error al cambiar estado de la mascota');
    }

    cargarMascotas();
  } catch (err) {
    alert(err.message);
  }
}

function prepararEdicion(id) {
  const pet = mascotasGuardadas.find(p => String(p.id) === String(id));
  if (!pet) return;

  document.getElementById('pet-id').value = pet.id;
  document.getElementById('pet-name').value = pet.name;
  document.getElementById('pet-phone').value = pet.contact_phone;
  document.getElementById('pet-medical').value = pet.medical_info || '';
  document.getElementById('pet-emails').value = pet.notification_emails || '';

  document.getElementById('form-title').innerText = 'Modificar Mascota';
  document.getElementById('btn-save').innerText = 'Actualizar Mascota';
  document.getElementById('btn-cancel').style.display = 'inline-block';
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  document.getElementById('pet-form').reset();
  document.getElementById('pet-id').value = '';
  document.getElementById('form-title').innerText = 'Registrar Nueva Mascota';
  document.getElementById('btn-save').innerText = 'Guardar Mascota';
  document.getElementById('btn-cancel').style.display = 'none';
}

async function eliminarMascota(id) {
  if (!confirm('¿Estás segura de que querés eliminar esta mascota?')) return;

  try {
    const response = await fetch(`/pets/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Error al eliminar la mascota');

    cargarMascotas();
  } catch (err) {
    alert(err.message);
  }
}

document.getElementById('pet-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('pet-id').value;
  const name = document.getElementById('pet-name').value;
  const contact_phone = document.getElementById('pet-phone').value;
  const notification_emails = document.getElementById('pet-emails').value;
  const medical_info = document.getElementById('pet-medical').value;

  const url = id ? `/pets/${id}` : '/pets';
  const method = id ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, contact_phone, notification_emails, medical_info })
    });

    if (!response.ok) throw new Error('Error al guardar cambios');

    resetForm();
    cargarMascotas();
  } catch (err) {
    alert(err.message);
  }
});

// Carga inicial al abrir la vista
cargarMascotas();