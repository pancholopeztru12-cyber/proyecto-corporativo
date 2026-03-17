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

async function cargarModulos() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch("/api/modulos", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        // 🛑 Escudo activado
        if (manejarErroresFetch(response)) return;

        if (response.ok) {
            const data = await response.json();
            const tabla = document.getElementById("tablaModulos");
            tabla.innerHTML = data.map(m => `
                <tr>
                    <td>${m.id}</td>
                    <td>${m.str_nombre_modulo}</td>
                    <td>${m.str_ruta}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error("Error:", error);
    }
}
document.addEventListener("DOMContentLoaded", cargarModulos);