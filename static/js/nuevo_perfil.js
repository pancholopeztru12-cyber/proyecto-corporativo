document.getElementById('formNuevoPerfil').addEventListener('submit', async function(e) {
    e.preventDefault();

    const nombre = document.getElementById('nombrePerfil').value;
    const descripcion = document.getElementById('descripcionPerfil').value;
    const esAdmin = document.getElementById('esAdministrador').checked;

    const token = localStorage.getItem('token');
    if (!token) {
        alert("Tu sesión expiró. Vuelve a iniciar sesión.");
        window.location.href = '/login.html';
        return;
    }

    const payload = {
        str_nombre_perfil: nombre,
        bit_administrador: esAdmin,
        descripcion: descripcion || null
    };

    try {
        // 👇 Se actualizó la ruta con el prefijo /api/ para evitar el Error 405
        const response = await fetch('/api/perfiles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert('¡Perfil creado con éxito!');
            window.location.href = '/usuarios.html'; 
        } else {
            alert('Error al crear el perfil. Verifica los datos.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión con el servidor.');
    }
});