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

    document.getElementById("nuevo_nombre_perfil").disabled = false;
    document.getElementById("esAdministrador").disabled = false;
    document.getElementById("btn-crear").style.display = "block";
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
    const tabla = document.getElementById("tablaPerfiles");
    
    // ⏳ Mostrar mensaje de carga antes de pedir los datos al servidor
    if (tabla) {
        tabla.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: #64748b; font-weight: bold;">⏳ Cargando perfiles, por favor espera...</td></tr>`;
    }

    try {
        const response = await fetch(API, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (manejarErroresFetch(response)) return;

        if (response.ok) {
            const data = await response.json();
            listaPerfilesData = data; 
            
            if (data.length === 0) {
                tabla.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: #64748b;">No hay perfiles registrados.</td></tr>`;
                return;
            }
            
            tabla.innerHTML = data.map(p => {
                const nombrePerfil = p.str_nombre_perfil || p.nombre || "Sin nombre";
                const badgeAdmin = p.bit_administrador ? `<span style="background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px; font-weight: bold;">ADMIN</span>` : '';

                // Candados de permisos con estilos unificados (usando flexbox en el contenedor)
                const puedeVerDetalle = (!window.permisosPantalla || window.permisosPantalla.detalle) ? `<button class="btn-detalle" onclick="verDetallePerfil(${p.id})" style="color:#0ea5e9; border: 1px solid #0ea5e9; padding: 4px 8px; border-radius: 4px; background: white; cursor: pointer; font-size: 13px; font-weight: 500;">Detalle</button>` : '';
                const puedeEditar = (!window.permisosPantalla || window.permisosPantalla.editar) ? `<button class="btn-editar" onclick="editarPerfil(${p.id})" style="color:#f59e0b; border: 1px solid #f59e0b; padding: 4px 8px; border-radius: 4px; background: white; cursor: pointer; font-size: 13px; font-weight: 500;">Editar</button>` : '';
                const puedeEliminar = (!window.permisosPantalla || window.permisosPantalla.eliminar) ? `<button class="btn-eliminar" onclick="eliminarPerfil(${p.id})" style="color:#ef4444; border: 1px solid #ef4444; padding: 4px 8px; border-radius: 4px; background: white; cursor: pointer; font-size: 13px; font-weight: 500;">Eliminar</button>` : '';

                return `
                <tr>
                    <td><strong>${p.id}</strong></td>
                    <td>
                        <span style="background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 12px; font-weight: bold;">${nombrePerfil}</span>
                        ${badgeAdmin}
                    </td>
                    <td>
                        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                            ${puedeVerDetalle}
                            ${puedeEditar}
                            ${puedeEliminar}
                        </div>
                    </td>
                </tr>
            `}).join('');
        }
    } catch (error) {
        console.error("Error cargando perfiles:", error);
        if (tabla) {
            tabla.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: red;">❌ Error al conectar con el servidor.</td></tr>`;
        }
    }
}

/* === VER DETALLE (Solo lectura) === */
function verDetallePerfil(id) {
    if (window.permisosPantalla && window.permisosPantalla.detalle === false) {
        alert("⛔ Acción denegada: No tienes permiso para ver el detalle.");
        return;
    }

    const p = listaPerfilesData.find(perfil => perfil.id === id);
    if (!p) return;

    // Llenar datos
    document.getElementById("perfil_id").value = p.id;
    document.getElementById("nuevo_nombre_perfil").value = p.str_nombre_perfil || p.nombre || "";
    document.getElementById("esAdministrador").checked = p.bit_administrador || false; 
    
    // Configurar Modal para Solo Lectura
    document.getElementById("modal-titulo").innerText = `Detalle del Perfil (ID: ${id})`;
    document.getElementById("nuevo_nombre_perfil").disabled = true; // Bloquea el input
    document.getElementById("esAdministrador").disabled = true; // Bloquea el switch
    document.getElementById("btn-crear").style.display = "none"; // Oculta el botón guardar

    document.getElementById("modal-perfil").style.display = "block";
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
    document.getElementById("nuevo_nombre_perfil").disabled = false;
    document.getElementById("esAdministrador").disabled = false;
    document.getElementById("btn-crear").style.display = "block";
    document.getElementById("modal-perfil").style.display = "block"; // Abrimos el modal
}

/* === GUARDAR (CREAR O ACTUALIZAR) PERFIL === */
async function guardarPerfil() {
    const token = localStorage.getItem("token");
    const id = document.getElementById("perfil_id").value;
    const nombrePerfilRaw = document.getElementById("nuevo_nombre_perfil").value;
    const esAdmin = document.getElementById("esAdministrador").checked; 

    // Limpiamos espacios al inicio y al final
    const nombrePerfilLimpio = nombrePerfilRaw.trim();

    // 🛡️ CANDADOS DE VALIDACIÓN DE LONGITUD
    if (!nombrePerfilLimpio) {
        alert("⚠️ El nombre del perfil es obligatorio.");
        return;
    }

    if (nombrePerfilLimpio.length < 3) {
        alert("⚠️ El nombre del perfil debe tener al menos 3 caracteres.");
        return;
    }

    if (nombrePerfilLimpio.length > 50) {
        alert("⚠️ El nombre del perfil es demasiado largo. Máximo 50 caracteres.");
        return;
    }

    const bodyData = { 
        str_nombre_perfil: nombrePerfilLimpio, // Enviamos el nombre limpio
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

            // <-- DIBUJAMOS PRINCIPAL 2 AQUI -->
            if (menuPrincipal2.length > 0) {
                htmlMenu += `<li style="margin-top:15px;"><strong style="color:#333;">Principal 2</strong><ul style="list-style:circle; padding-left:20px; margin-top:5px;">`;
                menuPrincipal2.forEach(nombre => {
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

    cargarMenuDinamico();

    // 🚀 SOLUCIÓN A LA "CARRERA": Esperar a que los permisos carguen antes de hacer la tabla
    let intentos = 0;
    const esperarPermisos = setInterval(() => {
        intentos++;
        
        // Verificamos si window.permisosPantalla ya tiene datos adentro (como {detalle: true})
        // o si ya pasaron 1.5 segundos (15 intentos) para no esperar infinitamente.
        if ((window.permisosPantalla && Object.keys(window.permisosPantalla).length > 0) || intentos > 15) {
            clearInterval(esperarPermisos); // Detenemos el reloj
            cargarPerfiles(); // ¡Ahora sí, dibujamos la tabla con los permisos correctos!
        }
    }, 100); // Revisa cada 100 milisegundos si ya llegaron los permisos
});