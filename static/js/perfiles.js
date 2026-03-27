const API = "/api/perfiles";
const API_BASE = "/api";
let listaPerfilesData = []; 

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

/* === LÓGICA DE LA VENTANA EMERGENTE (MODAL) === */
function abrirModalPerfil() {
    // 🛡️ CANDADO LÓGICO: Evita que abran el modal si no tienen permiso
    if (window.permisosPantalla && window.permisosPantalla.agregar === false) {
        alert("⛔ Acción denegada: No tienes permiso para crear perfiles.");
        return;
    }

    limpiarFormularioPerfil(); // Limpiamos los campos antes de abrir
    document.getElementById("modal-titulo").innerText = "Crear Nuevo Perfil";
    document.getElementById("modal-perfil").style.display = "block";
}

function cerrarModalPerfil() {
    document.getElementById("modal-perfil").style.display = "none";
}

/* === LIMPIAR FORMULARIO === */
function limpiarFormularioPerfil() {
    document.getElementById("perfil_id").value = "";
    document.getElementById("nuevo_nombre_perfil").value = "";
    document.getElementById("esAdministrador").checked = false;
}

/* === CARGAR PERFILES === */
async function cargarPerfiles() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(API, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (manejarErroresFetch(response)) return;

        if (response.ok) {
            const data = await response.json();
            listaPerfilesData = data; 
            const tabla = document.getElementById("tablaPerfiles");
            
            tabla.innerHTML = data.map(p => {
                const nombrePerfil = p.str_nombre_perfil || p.nombre || "Sin nombre";
                // Etiqueta visual si es administrador
                const badgeAdmin = p.bit_administrador ? `<span style="background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px; font-weight: bold;">ADMIN</span>` : '';

                return `
                <tr>
                    <td><strong>${p.id}</strong></td>
                    <td>
                        <span style="background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 12px; font-weight: bold;">${nombrePerfil}</span>
                        ${badgeAdmin}
                    </td>
                    <td>
                        <button class="btn-editar" onclick="editarPerfil(${p.id})" style="color:orange; border: 1px solid orange; padding: 2px 5px; border-radius: 4px; background: white; cursor: pointer;">Editar</button>
                        <button class="btn-eliminar" onclick="eliminarPerfil(${p.id})" style="color:red; border: 1px solid red; padding: 2px 5px; border-radius: 4px; background: white; cursor: pointer; margin-left: 5px;">Eliminar</button>
                    </td>
                </tr>
            `}).join('');
        }
    } catch (error) {
        console.error("Error cargando perfiles:", error);
    }
}

/* === EDITAR PERFIL (Llenar formulario y abrir modal) === */
function editarPerfil(id) {
    // 🛡️ CANDADO LÓGICO: Evita que editen si inyectan el botón a la fuerza
    if (window.permisosPantalla && window.permisosPantalla.editar === false) {
        alert("⛔ Acción denegada: No tienes permiso para editar perfiles.");
        return;
    }

    const p = listaPerfilesData.find(perfil => perfil.id === id);
    if (!p) return;

    document.getElementById("perfil_id").value = p.id;
    document.getElementById("nuevo_nombre_perfil").value = p.str_nombre_perfil || p.nombre || "";
    document.getElementById("esAdministrador").checked = p.bit_administrador || false; 
    
    document.getElementById("modal-titulo").innerText = `Editar Perfil (ID: ${id})`;
    document.getElementById("modal-perfil").style.display = "block"; // Abrimos el modal
}

/* === GUARDAR (CREAR O ACTUALIZAR) PERFIL === */
async function guardarPerfil() {
    const token = localStorage.getItem("token");
    const id = document.getElementById("perfil_id").value;
    const nombrePerfil = document.getElementById("nuevo_nombre_perfil").value;
    const esAdmin = document.getElementById("esAdministrador").checked; 

    if(!nombrePerfil.trim()) {
        alert("El nombre del perfil es obligatorio");
        return;
    }

    const bodyData = { 
        str_nombre_perfil: nombrePerfil,
        bit_administrador: esAdmin
    };

    const metodo = id ? "PUT" : "POST";
    const url = id ? `${API}/${id}` : API;

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(bodyData)
        });

        if (manejarErroresFetch(response)) return;

        if (response.ok) {
            // Cerramos el modal en lugar de solo limpiar
            cerrarModalPerfil();
            cargarPerfiles();
            alert(id ? "Perfil actualizado con éxito" : "Perfil creado con éxito");
        } else {
            alert("Error al guardar perfil.");
        }
    } catch (error) {
        alert("Error de conexión con el servidor");
    }
}

/* === ELIMINAR PERFIL === */
async function eliminarPerfil(id) {
    // 🛡️ CANDADO LÓGICO: Evita borrados maliciosos
    if (window.permisosPantalla && window.permisosPantalla.eliminar === false) {
        alert("⛔ Acción denegada: No tienes permiso para eliminar perfiles.");
        return;
    }

    if(confirm("¿Seguro que deseas eliminar este perfil? Esto podría afectar a los usuarios asignados a él.")) {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API}/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (manejarErroresFetch(response)) return;
        cargarPerfiles();
    }
}

/* === MENÚ DINÁMICO === */
async function cargarMenuDinamico() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_BASE}/menu-dinamico`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (manejarErroresFetch(response)) return;

        if (response.ok) {
            const modulos = await response.json();
            const lista = document.getElementById("lista-menu");
            if (!lista) return;
            
            lista.innerHTML = "";
            const menuSeguridad = [];
            const menuPrincipal1 = [];
            const menuPrincipal2 = [];

            modulos.forEach(m => {
                const nombre = m.nombre || m.str_nombre_modulo || m.str_nombre; 
                if (!nombre) return;

                const nombreLow = nombre.toLowerCase().replace(/\s+/g, '');
                if (["perfil", "módulo", "modulo", "permisos-perfil", "permisosperfil", "usuario"].includes(nombreLow)) {
                    menuSeguridad.push(nombre);
                } else if (["principal1.1", "principal1.2"].includes(nombreLow)) {
                    menuPrincipal1.push(nombre);
                } else if (["principal2.1", "principal2.2"].includes(nombreLow)) {
                    menuPrincipal2.push(nombre);
                } else {
                    menuSeguridad.push(nombre); 
                }
            });

            let htmlMenu = "";

            if (menuSeguridad.length > 0) {
                htmlMenu += `<li><strong style="color:#333;">Seguridad</strong><ul style="list-style:circle; padding-left:20px; margin-top:5px;">`;
                menuSeguridad.forEach(nombre => {
                    let link = `${nombre.toLowerCase().replace(/\s+/g, '')}.html`;
                    if (nombre.toLowerCase() === 'usuario') link = 'usuarios.html';
                    if (nombre.toLowerCase() === 'perfil') link = 'perfiles.html'; 
                    if (nombre.toLowerCase() === 'modulo' || nombre.toLowerCase() === 'módulo') link = 'modulos.html'; 
                    htmlMenu += `<li><a style="color: #cbd5e1; text-decoration: none;" href="/${link}">${nombre}</a></li>`;
                });
                htmlMenu += `</ul></li>`;
            }

            if (menuPrincipal1.length > 0) {
                htmlMenu += `<li style="margin-top:15px;"><strong style="color:#333;">Principal 1</strong><ul style="list-style:circle; padding-left:20px; margin-top:5px;">`;
                menuPrincipal1.forEach(nombre => {
                    const link = `${nombre.toLowerCase().replace(/\s+/g, '')}.html`;
                    htmlMenu += `<li><a style="color: #cbd5e1; text-decoration: none;" href="/${link}">${nombre}</a></li>`;
                });
                htmlMenu += `</ul></li>`;
            }

            lista.innerHTML = htmlMenu;
        }
    } catch (e) { console.error("Error menú:", e); }
}

/* === INICIALIZACIÓN === */
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    const nombreGuardado = localStorage.getItem("nombre_usuario") || "Usuario";
    const spanNombre = document.getElementById("nombre-usuario-nav");
    if (spanNombre) spanNombre.innerText = nombreGuardado;

    // Cerrar modal si hacen clic fuera de la cajita negra
    window.onclick = function(event) {
        const modal = document.getElementById('modal-perfil');
        if (event.target === modal) cerrarModalPerfil();
    }

    cargarPerfiles();
    cargarMenuDinamico();
});