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
    if (window.permisosPantalla && window.permisosPantalla.agregar === false) {
        alert("⛔ Acción denegada: No tienes permiso para crear perfiles.");
        return;
    }
    limpiarFormularioPerfil();
    document.getElementById("modal-titulo").innerText = "Crear Nuevo Perfil";
    document.getElementById("modal-perfil").style.display = "block";
}

function cerrarModalPerfil() {
    document.getElementById("modal-perfil").style.display = "none";
    document.getElementById("nuevo_nombre_perfil").disabled = false;
    document.getElementById("esAdministrador").disabled = false;
    document.getElementById("btn-crear").style.display = "block";
}

function limpiarFormularioPerfil() {
    document.getElementById("perfil_id").value = "";
    document.getElementById("nuevo_nombre_perfil").value = "";
    document.getElementById("esAdministrador").checked = false;
}

/* === CARGAR PERFILES === */
async function cargarPerfiles() {
    const token = localStorage.getItem("token");
    const tabla = document.getElementById("tablaPerfiles");
    
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
            renderizarTablaPerfiles(listaPerfilesData); // Dibujamos con la nueva función
        }
    } catch (error) {
        console.error("Error cargando perfiles:", error);
        if (tabla) {
            tabla.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: red;">❌ Error al conectar con el servidor.</td></tr>`;
        }
    }
}

/* === NUEVO: RENDERIZAR TABLA (Para poder filtrar sin llamar al servidor) === */
function renderizarTablaPerfiles(data) {
    const tabla = document.getElementById("tablaPerfiles");
    if (!tabla) return;

    if (data.length === 0) {
        tabla.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: #64748b;">No hay perfiles registrados o no coinciden con la búsqueda.</td></tr>`;
        return;
    }
    
    // Aquí agregamos el (p, index) para poder usar el número de fila
    tabla.innerHTML = data.map((p, index) => {
        const numeroFila = index + 1; // Contador empezando en 1
        const nombrePerfil = p.str_nombre_perfil || p.nombre || "Sin nombre";
        const badgeAdmin = p.bit_administrador ? `<span style="background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px; font-weight: bold;">ADMIN</span>` : '';

        const puedeVerDetalle = (!window.permisosPantalla || window.permisosPantalla.detalle) ? `<button class="btn-detalle" onclick="verDetallePerfil(${p.id})" style="color:#0ea5e9; border: 1px solid #0ea5e9; padding: 4px 8px; border-radius: 4px; background: white; cursor: pointer; font-size: 13px; font-weight: 500;">Detalle</button>` : '';
        const puedeEditar = (!window.permisosPantalla || window.permisosPantalla.editar) ? `<button class="btn-editar" onclick="editarPerfil(${p.id})" style="color:#f59e0b; border: 1px solid #f59e0b; padding: 4px 8px; border-radius: 4px; background: white; cursor: pointer; font-size: 13px; font-weight: 500;">Editar</button>` : '';
        const puedeEliminar = (!window.permisosPantalla || window.permisosPantalla.eliminar) ? `<button class="btn-eliminar" onclick="eliminarPerfil(${p.id})" style="color:#ef4444; border: 1px solid #ef4444; padding: 4px 8px; border-radius: 4px; background: white; cursor: pointer; font-size: 13px; font-weight: 500;">Eliminar</button>` : '';

        return `
        <tr>
            <td><strong>${numeroFila}</strong></td>
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

/* === NUEVO: FUNCIÓN PARA FILTRAR === */
function filtrarPerfiles() {
    const input = document.getElementById("inputFiltroPerfiles");
    if (!input) return;

    const termino = input.value.toLowerCase().trim();
    
    const resultados = listaPerfilesData.filter(p => {
        const nombre = (p.str_nombre_perfil || p.nombre || "").toLowerCase();
        // Seguimos permitiendo buscar por ID internamente aunque no se vea
        const id = p.id ? p.id.toString() : ""; 
        return nombre.includes(termino) || id.includes(termino);
    });

    renderizarTablaPerfiles(resultados);
}

/* === NUEVO: FUNCIÓN PARA EXPORTAR A EXCEL (CSV) === */
function exportarExcel() {
    if (listaPerfilesData.length === 0) {
        alert("⚠️ No hay datos para exportar.");
        return;
    }

    // Cambiamos el encabezado a N°
    let csvContent = "N°,Nombre del Perfil,Es Administrador\n";

    listaPerfilesData.forEach((p, index) => {
        const numeroFila = index + 1; // Usamos el número consecutivo
        const nombre = p.str_nombre_perfil || p.nombre || "Sin nombre";
        const esAdmin = p.bit_administrador ? "Si" : "No";
        
        csvContent += `${numeroFila},"${nombre}",${esAdmin}\n`;
    });

    // \uFEFF asegura que Excel lea los acentos y ñ correctamente (UTF-8)
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", "Reporte_Perfiles.csv"); 
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/* === VER DETALLE (Solo lectura) === */
function verDetallePerfil(id) {
    if (window.permisosPantalla && window.permisosPantalla.detalle === false) {
        alert("⛔ Acción denegada: No tienes permiso para ver el detalle.");
        return;
    }

    const p = listaPerfilesData.find(perfil => perfil.id === id);
    if (!p) return;

    document.getElementById("perfil_id").value = p.id;
    document.getElementById("nuevo_nombre_perfil").value = p.str_nombre_perfil || p.nombre || "";
    document.getElementById("esAdministrador").checked = p.bit_administrador || false; 
    
    document.getElementById("modal-titulo").innerText = `Detalle del Perfil`; // ID Removido
    document.getElementById("nuevo_nombre_perfil").disabled = true; 
    document.getElementById("esAdministrador").disabled = true; 
    document.getElementById("btn-crear").style.display = "none"; 

    document.getElementById("modal-perfil").style.display = "block";
}

/* === EDITAR PERFIL === */
function editarPerfil(id) {
    if (window.permisosPantalla && window.permisosPantalla.editar === false) {
        alert("⛔ Acción denegada: No tienes permiso para editar perfiles.");
        return;
    }

    const p = listaPerfilesData.find(perfil => perfil.id === id);
    if (!p) return;

    document.getElementById("perfil_id").value = p.id;
    document.getElementById("nuevo_nombre_perfil").value = p.str_nombre_perfil || p.nombre || "";
    document.getElementById("esAdministrador").checked = p.bit_administrador || false; 
    
    document.getElementById("modal-titulo").innerText = `Editar Perfil`; // ID Removido
    document.getElementById("nuevo_nombre_perfil").disabled = false;
    document.getElementById("esAdministrador").disabled = false;
    document.getElementById("btn-crear").style.display = "block";
    document.getElementById("modal-perfil").style.display = "block"; 
}

/* === GUARDAR PERFIL === */
async function guardarPerfil() {
    const token = localStorage.getItem("token");
    const id = document.getElementById("perfil_id").value;
    const nombrePerfilLimpio = document.getElementById("nuevo_nombre_perfil").value.trim();
    const esAdmin = document.getElementById("esAdministrador").checked; 

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
        str_nombre_perfil: nombrePerfilLimpio,
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

    window.onclick = function(event) {
        const modal = document.getElementById('modal-perfil');
        if (event.target === modal) cerrarModalPerfil();
    }

    cargarMenuDinamico();

    let intentos = 0;
    const esperarPermisos = setInterval(() => {
        intentos++;
        if ((window.permisosPantalla && Object.keys(window.permisosPantalla).length > 0) || intentos > 15) {
            clearInterval(esperarPermisos); 
            cargarPerfiles(); 
        }
    }, 100); 
});