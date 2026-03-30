const API = "/api";
let listaModulosData = []; // Guardamos los datos para poder ver los detalles fácilmente

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

/* === CARGAR MÓDULOS EN LA TABLA === */
async function cargarModulos() {
    const token = localStorage.getItem("token");
    const tabla = document.getElementById("tablaModulos");
    
    // ⏳ Mostrar mensaje de carga
    if (tabla) {
        tabla.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b; font-weight: bold;">⏳ Cargando módulos, por favor espera...</td></tr>`;
    }

    try {
        const response = await fetch(`${API}/modulos`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (manejarErroresFetch(response)) return;

        if (response.ok) {
            listaModulosData = await response.json();
            
            // ⏳ EL RELOJITO: Esperamos los permisos antes de dibujar los botones
            esperarPermisosYRenderizar();
        }
    } catch (error) {
        console.error("Error:", error);
        if (tabla) {
            tabla.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: red;">❌ Error al conectar con el servidor.</td></tr>`;
        }
    }
}

function esperarPermisosYRenderizar() {
    if (window.permisosPantalla) {
        renderizarTablaModulos(listaModulosData); // Ahora le pasamos la data
    } else {
        setTimeout(esperarPermisosYRenderizar, 50);
    }
}

function renderizarTablaModulos(data) {
    const tabla = document.getElementById("tablaModulos");
    if (!tabla) return;
    const permisos = window.permisosPantalla;

    if (data.length === 0) {
        tabla.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">No hay módulos registrados o no coinciden con la búsqueda.</td></tr>`;
        return;
    }

    // Agregamos el index para el número de fila
    tabla.innerHTML = data.map((m, index) => {
        const numeroFila = index + 1;
        const nombreStr = m.str_nombre_modulo || m.nombre || "N/A";
        const rutaStr = m.str_ruta || "N/A";
        
        // 🎨 CONSTRUCCIÓN DE BOTONES CON FLEXBOX
        let botones = `<div style="display: flex; gap: 8px; justify-content: center;">`;

        if (permisos.detalle) {
            botones += `<button class="btn-detalle" onclick="verDetalleModulo(${m.id})" style="color:#0ea5e9; border: 1px solid #0ea5e9; padding: 4px 8px; border-radius: 4px; background: white; cursor: pointer; font-weight: 500;">🔍 Detalle</button>`;
        }
        if (permisos.editar) {
            botones += `<button class="btn-editar" onclick="abrirEdicion(${m.id})" style="color:#f59e0b; border: 1px solid #f59e0b; padding: 4px 8px; border-radius: 4px; background: white; cursor: pointer; font-weight: 500;">✏️ Editar</button>`;
        }
        
        botones += `</div>`;

        return `
        <tr>
            <td><strong>${numeroFila}</strong></td>
            <td><span style="background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 12px; font-weight: bold;">${nombreStr}</span></td>
            <td>${rutaStr}</td>
            <td>${botones}</td>
        </tr>
        `;
    }).join('');
}

/* === NUEVO: FUNCIÓN PARA FILTRAR === */
function filtrarModulos() {
    const input = document.getElementById("inputFiltroModulos");
    if (!input) return;

    const termino = input.value.toLowerCase().trim();
    
    const resultados = listaModulosData.filter(m => {
        const nombre = (m.str_nombre_modulo || m.nombre || "").toLowerCase();
        // Seguimos permitiendo buscar por ID internamente aunque no se vea en la tabla
        const id = m.id ? m.id.toString() : "";
        return nombre.includes(termino) || id.includes(termino);
    });

    renderizarTablaModulos(resultados);
}

/* === NUEVO: FUNCIÓN PARA EXPORTAR A EXCEL (CSV) === */
function exportarExcel() {
    if (listaModulosData.length === 0) {
        alert("⚠️ No hay datos para exportar.");
        return;
    }

    // Cambiamos el encabezado a N°
    let csvContent = "N°,Nombre del Módulo,Ruta\n";

    listaModulosData.forEach((m, index) => {
        const numeroFila = index + 1;
        const nombre = m.str_nombre_modulo || m.nombre || "N/A";
        const ruta = m.str_ruta || "N/A";
        
        csvContent += `${numeroFila},"${nombre}","${ruta}"\n`;
    });

    // \uFEFF asegura que Excel lea los acentos y ñ correctamente (UTF-8)
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", "Reporte_Modulos.csv"); 
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/* === LÓGICA DEL FORMULARIO EN LÍNEA === */

function alternarCamposLectura(soloLectura) {
    document.getElementById("edit-nombre").disabled = soloLectura;
    document.getElementById("edit-ruta").disabled = soloLectura;
    
    // Ocultar/Mostrar botón de guardar
    const btnGuardar = document.getElementById("btn-guardar-modulo");
    if (btnGuardar) {
        btnGuardar.style.display = soloLectura ? "none" : "inline-block";
    }
}

// 1. Mostrar Detalle (Solo lectura)
function verDetalleModulo(id) {
    if (window.permisosPantalla && window.permisosPantalla.detalle === false) {
        alert("⛔ Acción denegada: No tienes permiso para ver detalles.");
        return;
    }

    const m = listaModulosData.find(mod => mod.id === id);
    if (!m) return;

    document.getElementById("edit-id").value = m.id;
    document.getElementById("edit-nombre").value = m.str_nombre_modulo || m.nombre || "";
    document.getElementById("edit-ruta").value = m.str_ruta || "";
    
    // Configuración visual para detalle
    document.getElementById("form-titulo").innerHTML = `🔍 Detalles del Módulo (Solo Lectura)`;
    document.getElementById("form-titulo").style.borderLeftColor = "#0ea5e9"; // Línea azul
    alternarCamposLectura(true);

    document.getElementById("form-edicion").style.display = "block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 2. Mostrar el formulario para Editar
function abrirEdicion(id) {
    // 🛡️ CANDADO LÓGICO
    if (window.permisosPantalla && window.permisosPantalla.editar === false) {
        alert("⛔ Acción denegada: No tienes permiso para editar módulos.");
        return;
    }

    const m = listaModulosData.find(mod => mod.id === id);
    if (!m) return;

    document.getElementById("edit-id").value = m.id;
    document.getElementById("edit-nombre").value = m.str_nombre_modulo || m.nombre || "";
    document.getElementById("edit-ruta").value = m.str_ruta || "";
    
    // Configuración visual para edición
    document.getElementById("form-titulo").innerHTML = `✏️ Editar Módulo`;
    document.getElementById("form-titulo").style.borderLeftColor = "#f59e0b"; // Línea naranja
    alternarCamposLectura(false);

    document.getElementById("form-edicion").style.display = "block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 3. Ocultar el formulario
function cerrarEdicion() {
    document.getElementById("form-edicion").style.display = "none";
    document.getElementById("edit-id").value = "";
    document.getElementById("edit-nombre").value = "";
    document.getElementById("edit-ruta").value = "";
}

// 4. Enviar la actualización al backend
async function guardarEdicionModulo() {
    const id = document.getElementById("edit-id").value;
    const nombre = document.getElementById("edit-nombre").value.trim();
    const ruta = document.getElementById("edit-ruta").value.trim();
    const token = localStorage.getItem("token");

    if (!nombre) {
        alert("El nombre del módulo no puede estar vacío.");
        return;
    }

    try {
        const response = await fetch(`${API}/modulos/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                str_nombre_modulo: nombre,
                str_ruta: ruta
            })
        });

        if (response.ok) {
            alert("Módulo actualizado con éxito");
            cerrarEdicion();
            cargarModulos(); 
        } else {
            const errorData = await response.json();
            alert("Error al actualizar: " + (errorData.message || "Verifica tu backend"));
        }
    } catch (error) {
        console.error("Error:", error);
        alert("No se pudo conectar con el servidor.");
    }
}

/* === CARGAR MENÚ DINÁMICO === */
async function cargarMenuDinamico() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API}/menu-dinamico`, {
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
    // 1. Verificar si hay sesión
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    // 2. Cargar el nombre del usuario en el header
    const nombreGuardado = localStorage.getItem("nombre_usuario") || "Usuario";
    const spanNombre = document.getElementById("nombre-usuario-nav");
    if (spanNombre) {
        spanNombre.innerText = nombreGuardado;
    }

    // 3. Cargar menú y tabla
    cargarMenuDinamico();
    cargarModulos();
});