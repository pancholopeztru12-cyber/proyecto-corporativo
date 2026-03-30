const API = "/api";
let permisosActuales = []; 
let todosLosModulos = []; 

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

/* ==========================================
   CARGAS INICIALES (Selectores y Menú)
   ========================================== */
async function cargarCatalogos() {
    const token = localStorage.getItem("token");
    const headers = { "Authorization": `Bearer ${token}` };

    try {
        // 1. Cargar Perfiles para el Select
        const resPerfiles = await fetch(`${API}/perfiles`, { headers });
        if (manejarErroresFetch(resPerfiles)) return;
        
        if (resPerfiles.ok) {
            const perfiles = await resPerfiles.json();
            const selectP = document.getElementById("select_perfil");
            selectP.innerHTML = `<option value="">Seleccione un Perfil...</option>`; 
            perfiles.forEach(p => selectP.innerHTML += `<option value="${p.id}">${p.str_nombre_perfil || 'Perfil '+p.id}</option>`);
        }

        // 2. Cargar TODOS los Módulos del sistema
        const resModulos = await fetch(`${API}/modulos`, { headers });
        if (manejarErroresFetch(resModulos)) return;

        if (resModulos.ok) {
            todosLosModulos = await resModulos.json();
        }
    } catch (e) { console.error("Error cargando catálogos:", e); }
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

/* ==========================================
   NUEVA LÓGICA DE MATRIZ (ÁRBOL)
   ========================================== */
async function cargarPermisos() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API}/permisos_perfil?pagina=1`, { 
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (manejarErroresFetch(response)) return;

        permisosActuales = await response.json(); 
        renderizarTablaMatriz();
    } catch (error) { console.error("Error cargando permisos:", error); }
}

function renderizarTablaMatriz() {
    const idPerfil = document.getElementById("select_perfil").value;
    const tabla = document.getElementById("tablaPermisos");
    const btnGuardar = document.getElementById("btn-guardar");
    
    tabla.innerHTML = ""; 

    if (!idPerfil) {
        tabla.innerHTML = `<tr><td colspan="6" style="padding: 40px; text-align: center; color: #64748b; font-size: 16px;">👆 Selecciona un perfil en la parte superior para cargar su matriz de permisos.</td></tr>`;
        btnGuardar.style.display = "none";
        return;
    }

    // 🛡️ CANDADO VISUAL: Solo mostrar el botón si tiene permisos de edición
    if (window.permisosPantalla && window.permisosPantalla.editar === false) {
        btnGuardar.style.display = "none";
    } else {
        btnGuardar.style.display = "inline-block";
    }

    // 1. Filtrar permisos solo del perfil seleccionado
    const permisosDelPerfil = permisosActuales.filter(p => p.id_perfil == idPerfil);

    // 2. Agrupar módulos visualmente
    const grupos = { "Seguridad": [], "Principal 1": [], "Principal 2": [], "Otros": [] };
    
    todosLosModulos.forEach(m => {
        let nombre = (m.str_nombre_modulo || "").toLowerCase().replace(/\s+/g, '');
        if (["perfil", "módulo", "modulo", "permisos-perfil", "permisosperfil", "usuario"].includes(nombre)) {
            grupos["Seguridad"].push(m);
        } else if (["principal1.1", "principal1.2"].includes(nombre)) {
            grupos["Principal 1"].push(m);
        } else if (["principal2.1", "principal2.2"].includes(nombre)) {
            grupos["Principal 2"].push(m);
        } else {
            grupos["Otros"].push(m);
        }
    });

    // 3. Dibujar la tabla
    let htmlMatriz = "";

    Object.keys(grupos).forEach(categoria => {
        if (grupos[categoria].length === 0) return;

        htmlMatriz += `
            <tr class="fila-categoria" onclick="toggleCategoria('${categoria.replace(/\s+/g, '')}')">
                <td colspan="6" style="padding: 12px 15px;">
                    <span id="icon-${categoria.replace(/\s+/g, '')}" style="display:inline-block; width:20px;">▼</span> 
                    <span style="font-size: 15px;">${categoria}</span>
                </td>
            </tr>
        `;

        grupos[categoria].forEach(m => {
            const perm = permisosDelPerfil.find(p => p.id_modulo === m.id) || {};
            const chk = (val) => val ? "checked" : "";
            const attrIdPermisoDb = perm.id ? `data-id-permiso="${perm.id}"` : "";

            htmlMatriz += `
                <tr class="fila-modulo cat-${categoria.replace(/\s+/g, '')}" data-id-modulo="${m.id}">
                    <td class="col-modulo-nombre">${m.str_nombre_modulo}</td>
                    <td><input type="checkbox" class="chk-permiso chk-agregar" ${chk(perm.bit_agregar)} ${attrIdPermisoDb}></td>
                    <td><input type="checkbox" class="chk-permiso chk-editar" ${chk(perm.bit_editar)}></td>
                    <td><input type="checkbox" class="chk-permiso chk-eliminar" ${chk(perm.bit_eliminar)}></td>
                    <td><input type="checkbox" class="chk-permiso chk-consulta" ${chk(perm.bit_consulta)}></td>
                    <td><input type="checkbox" class="chk-permiso chk-detalle" ${chk(perm.bit_detalle)}></td>
                </tr>
            `;
        });
    });

    tabla.innerHTML = htmlMatriz;

    // 🛡️ CANDADO VISUAL EXTRA: Si no tiene edición, deshabilitar los checkboxes para que no engañen al usuario
    if (window.permisosPantalla && window.permisosPantalla.editar === false) {
        document.querySelectorAll(".chk-permiso").forEach(chk => {
            chk.disabled = true;
        });
    }
}

function toggleCategoria(catClase) {
    const filas = document.querySelectorAll(`.cat-${catClase}`);
    const icono = document.getElementById(`icon-${catClase}`);
    let isHidden = false;
    
    filas.forEach(fila => {
        if (fila.style.display === "none") {
            fila.style.display = "table-row";
            isHidden = true;
        } else {
            fila.style.display = "none";
        }
    });
    
    icono.innerText = isHidden ? "▼" : "▶";
}

/* ==========================================
   GUARDAR MATRIZ COMPLETA
   ========================================== */
async function guardarMatrizPermisos() {
    // 🛡️ CANDADO LÓGICO
    if (window.permisosPantalla && window.permisosPantalla.editar === false) {
        alert("⛔ Acción denegada: No tienes permiso para modificar esta matriz.");
        return;
    }

    const token = localStorage.getItem("token");
    const idPerfil = document.getElementById("select_perfil").value;
    const filas = document.querySelectorAll(".fila-modulo");
    
    if(!idPerfil) return alert("Selecciona un perfil");

    const btnGuardar = document.getElementById("btn-guardar");
    btnGuardar.innerText = "⏳ Guardando...";
    btnGuardar.disabled = true;

    let peticiones = [];

    filas.forEach(fila => {
        const idModulo = fila.getAttribute("data-id-modulo");
        const chkAgregar = fila.querySelector(".chk-agregar");
        
        const payload = {
            id_perfil: parseInt(idPerfil),
            id_modulos: [parseInt(idModulo)], 
            bit_agregar: chkAgregar.checked,
            bit_editar: fila.querySelector(".chk-editar").checked,
            bit_eliminar: fila.querySelector(".chk-eliminar").checked,
            bit_consulta: fila.querySelector(".chk-consulta").checked,
            bit_detalle: fila.querySelector(".chk-detalle").checked // ¡El detalle se manda al backend!
        };

        const idPermisoExistente = chkAgregar.getAttribute("data-id-permiso");
        const tieneAlgunPermiso = payload.bit_agregar || payload.bit_editar || payload.bit_eliminar || payload.bit_consulta || payload.bit_detalle;

        if (idPermisoExistente) {
            peticiones.push(fetch(`${API}/permisos_perfil/${idPermisoExistente}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(payload)
            }));
        } else if (tieneAlgunPermiso) {
            peticiones.push(fetch(`${API}/permisos_perfil`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(payload)
            }));
        }
    });

    try {
        await Promise.all(peticiones);
        alert("¡Permisos actualizados correctamente!");
        await cargarPermisos(); 
    } catch (error) {
        console.error("Error guardando matriz:", error);
        alert("Hubo un error al guardar los permisos. Verifica la consola.");
    } finally {
        btnGuardar.innerText = "💾 Guardar Cambios del Perfil";
        btnGuardar.disabled = false;
    }
}

/* ==========================================
   INICIALIZACIÓN CON RELOJITO DE PERMISOS
   ========================================== */
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    const nombreGuardado = localStorage.getItem("nombre_usuario") || "Usuario";
    const spanNombre = document.getElementById("nombre-usuario-nav");
    if (spanNombre) {
        spanNombre.innerText = nombreGuardado;
    }

    document.getElementById("select_perfil").addEventListener("change", renderizarTablaMatriz);

    // ⏳ EL RELOJITO: Esperamos los permisos antes de arrancar todo
    esperarPermisosYIniciar();
});

function esperarPermisosYIniciar() {
    if (window.permisosPantalla) {
        // En cuanto sepamos los permisos, arrancamos el sistema
        cargarCatalogos();
        cargarMenuDinamico();
        cargarPermisos();
    } else {
        setTimeout(esperarPermisosYIniciar, 50);
    }
}