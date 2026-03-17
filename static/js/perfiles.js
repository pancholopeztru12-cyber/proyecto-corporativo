const API = "/api/perfiles";

/* === FUNCIÓN GLOBAL DE ERRORES === */
function manejarErroresFetch(response) {
    if (response.status === 401) {
        window.location.href = "/login.html";
        return true;
    } else if (response.status === 403 || response.status >= 500) {
        window.location.href = "/error.html";
        return true;
    }
    return false;
}

async function cargarPerfiles() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(API, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        // 🛑 Escudo activado
        if (manejarErroresFetch(response)) return;

        if (response.ok) {
            const data = await response.json();
            const tabla = document.getElementById("tablaPerfiles");
            tabla.innerHTML = data.map(p => `
                <tr>
                    <td>${p.id}</td>
                    <td>${p.str_nombre_perfil}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error("Error cargando perfiles:", error);
    }
}

document.addEventListener("DOMContentLoaded", cargarPerfiles);