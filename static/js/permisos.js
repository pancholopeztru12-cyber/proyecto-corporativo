// Función para obtener los permisos de un módulo específico
async function obtenerPermisosModulo(nombreModulo) {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
        // Llamamos al endpoint de menú dinámico que creamos en Rust
        const response = await fetch("/menu-permisos", {
            headers: { "Authorization": "Bearer " + token }
        });

        if (!response.ok) return null;

        const modulos = await response.json();
        // Buscamos los permisos exactos para el módulo donde estamos (ej: "Usuario")
        return modulos.find(m => m.nombre === nombreModulo);
    } catch (error) {
        console.error("Error obteniendo permisos:", error);
        return null;
    }
}

// Función para ocultar elementos del DOM según los bits de permiso
function aplicarRestriccionesUI(permisos) {
    if (!permisos) return;

    // Si no puede agregar, ocultamos el botón de Crear o el formulario
    if (!permisos.agregar) {
        const btnCrear = document.getElementById("btn-crear") || document.querySelector(".btn-success");
        if (btnCrear) btnCrear.style.display = "none";
    }

    // Si no puede eliminar, ocultamos los botones de eliminar en la tabla
    if (!permisos.eliminar) {
        // Usamos un intervalo o MutationObserver si la tabla carga después
        const interval = setInterval(() => {
            const btnsEliminar = document.querySelectorAll(".btn-delete, button[onclick*='eliminar']");
            if (btnsEliminar.length > 0) {
                btnsEliminar.forEach(btn => btn.style.display = "none");
                clearInterval(interval);
            }
        }, 100);
        // Detener búsqueda después de 3 segundos por seguridad
        setTimeout(() => clearInterval(interval), 3000);
    }

    // Si no puede editar, ocultamos botones de edición
    if (!permisos.editar) {
        const intervalEdit = setInterval(() => {
            const btnsEditar = document.querySelectorAll(".btn-edit, button[onclick*='editar']");
            if (btnsEditar.length > 0) {
                btnsEditar.forEach(btn => btn.style.display = "none");
                clearInterval(intervalEdit);
            }
        }, 100);
        setTimeout(() => clearInterval(intervalEdit), 3000);
    }
}

// Función para renderizar los Breadcrumbs obligatorios 
function renderBreadcrumbs(menuPadre, moduloHijo) {
    const container = document.getElementById("breadcrumbs");
    if (container) {
        container.innerHTML = `<nav style="margin-bottom:15px; color:#555;">
            ${menuPadre} &gt; <span style="font-weight:bold; color:#000;">${moduloHijo}</span>
        </nav>`;
    }
}