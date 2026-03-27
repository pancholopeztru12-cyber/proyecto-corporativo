const API = "/api";

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
    try {
        const response = await fetch(`${API}/modulos`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (manejarErroresFetch(response)) return;

        if (response.ok) {
            const data = await response.json();
            const tabla = document.getElementById("tablaModulos");
            
            // Renderizamos la tabla con el botón de "Editar" agregado
            tabla.innerHTML = data.map(m => {
                const nombreStr = m.str_nombre_modulo || m.nombre || "";
                const rutaStr = m.str_ruta || "";
                
                return `
                <tr>
                    <td><strong>${m.id}</strong></td>
                    <td><span style="background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 12px; font-weight: bold;">${nombreStr || "N/A"}</span></td>
                    <td>${rutaStr || "N/A"}</td>
                    <td>
                        <button class="btn-editar" onclick="abrirEdicion(${m.id}, '${nombreStr}', '${rutaStr}')" style="border: 1px solid #f59e0b; color: #f59e0b; background: white; padding: 5px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                            Editar
                        </button>
                    </td>
                </tr>
                `;
            }).join('');
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

/* === NUEVAS FUNCIONES PARA EDITAR MÓDULOS === */

// 1. Mostrar el formulario con los datos cargados
function abrirEdicion(id, nombre, ruta) {
    // 🛡️ CANDADO LÓGICO: Evita que abran la edición si no tienen permiso
    if (window.permisosPantalla && window.permisosPantalla.editar === false) {
        alert("⛔ Acción denegada: No tienes permiso para editar módulos.");
        return;
    }

    document.getElementById("form-edicion").style.display = "block";
    document.getElementById("edit-id").value = id;
    document.getElementById("edit-nombre").value = nombre;
    document.getElementById("edit-ruta").value = ruta;
    // Hacemos scroll hacia arriba para que el usuario vea el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 2. Ocultar el formulario y limpiar los campos
function cerrarEdicion() {
    document.getElementById("form-edicion").style.display = "none";
    document.getElementById("edit-id").value = "";
    document.getElementById("edit-nombre").value = "";
    document.getElementById("edit-ruta").value = "";
}

// 3. Enviar la actualización al backend
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
        // Hacemos un PUT a /api/modulos/{id}
        const response = await fetch(`${API}/modulos/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            // Asegúrate de que tu backend en Rust reciba estos nombres de campos (str_nombre_modulo y str_ruta)
            body: JSON.stringify({
                str_nombre_modulo: nombre,
                str_ruta: ruta
            })
        });

        if (response.ok) {
            alert("Módulo actualizado con éxito");
            cerrarEdicion();
            cargarModulos(); // Recargamos la tabla para ver los cambios
        } else {
            const errorData = await response.json();
            alert("Error al actualizar: " + (errorData.message || "Verifica tu backend"));
        }
    } catch (error) {
        console.error("Error:", error);
        alert("No se pudo conectar con el servidor.");
    }
}


/* === EL RESTO DEL CÓDIGO INTACTO === */

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