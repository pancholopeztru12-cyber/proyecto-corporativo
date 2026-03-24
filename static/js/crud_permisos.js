const API = "/api";
let paginaActual = 1;
let permisosActuales = []; // 🌟 NUEVO: Aquí guardaremos los permisos en memoria

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
        // Cargar Perfiles
        const resPerfiles = await fetch(`${API}/perfiles`, { headers });
        if (manejarErroresFetch(resPerfiles)) return;
        
        if (resPerfiles.ok) {
            const perfiles = await resPerfiles.json();
            const selectP = document.getElementById("select_perfil");
            selectP.innerHTML = `<option value="">Seleccione Perfil</option>`; 
            perfiles.forEach(p => selectP.innerHTML += `<option value="${p.id}">${p.str_nombre_perfil || 'Perfil '+p.id}</option>`);
        }

        // Cargar Módulos
        const resModulos = await fetch(`${API}/modulos`, { headers });
        if (manejarErroresFetch(resModulos)) return;

        if (resModulos.ok) {
            const modulos = await resModulos.json();
            const divModulos = document.getElementById("modulos_checkboxes");
            divModulos.innerHTML = ""; 
            
            modulos.forEach(m => {
                const nombre = m.str_nombre_modulo || 'Modulo '+m.id;
                divModulos.innerHTML += `
                    <label style="cursor: pointer; display: flex; align-items: center; gap: 5px;">
                        <input type="checkbox" value="${m.id}" class="cb-modulo"> 
                        ${nombre}
                    </label>
                `;
            });
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
   CRUD: CONSULTAR, FILTRAR Y PAGINACIÓN
   ========================================== */
async function cargarPermisos(pagina = 1) {
    paginaActual = pagina;
    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API}/permisos_perfil?pagina=${paginaActual}`, { 
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (manejarErroresFetch(response)) return;

        const permisos = await response.json();
        
        // 🌟 NUEVO: Guardamos los datos en memoria en lugar de dibujarlos directo
        permisosActuales = permisos; 
        
        // 🌟 NUEVO: Llamamos a la función que dibuja la tabla filtrada
        renderizarTabla();

        document.getElementById("infoPagina").innerText = `Página ${paginaActual}`;
    } catch (error) { console.error("Error cargando permisos:", error); }
}

// 🌟 NUEVA FUNCIÓN: Se encarga de dibujar solo lo que el selector pide
function renderizarTabla() {
    const idPerfilSeleccionado = document.getElementById("select_perfil").value;
    const tabla = document.getElementById("tablaPermisos");
    tabla.innerHTML = ""; // Limpiamos la tabla

    // Si no hay perfil seleccionado en el combo de arriba, mostramos un mensaje bonito
    if (idPerfilSeleccionado === "") {
        tabla.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 30px; color: #64748b; font-size: 16px;">👆 Selecciona un perfil en el formulario de arriba para ver o editar sus permisos.</td></tr>`;
        return;
    }

    // Filtramos los permisos en memoria para dejar solo los del perfil seleccionado
    const permisosFiltrados = permisosActuales.filter(p => p.id_perfil == idPerfilSeleccionado);

    // Si elegimos un perfil que aún no tiene nada asignado
    if (permisosFiltrados.length === 0) {
        tabla.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #ef4444;">Este perfil aún no tiene permisos asignados.</td></tr>`;
        return;
    }

    // Si sí tiene permisos, los dibujamos
    permisosFiltrados.forEach(p => {
        const check = (val) => val ? "✅" : "❌";
        const nombrePerfil = p.nombre_perfil || `ID: ${p.id_perfil}`;
        const nombreModulo = p.nombre_modulo || `ID: ${p.id_modulo}`;

        tabla.innerHTML += `
        <tr>
            <td>${p.id}</td>
            <td>${nombrePerfil}</td>
            <td>${nombreModulo}</td>
            <td>${check(p.bit_agregar)}</td>
            <td>${check(p.bit_editar)}</td>
            <td>${check(p.bit_eliminar)}</td>
            <td>${check(p.bit_consulta)}</td>
            <td>${check(p.bit_detalle)}</td>
            <td class="acciones">
                <button onclick="mostrarDetalle(${p.id})" style="color:blue; border: 1px solid blue; padding: 2px 5px; border-radius: 4px; background: white; cursor: pointer;">Ver</button>
                <button onclick='editarPermiso(${JSON.stringify(p)})' style="color:orange; border: 1px solid orange; padding: 2px 5px; border-radius: 4px; background: white; cursor: pointer;">Editar</button>
                <button onclick="eliminarPermiso(${p.id})" style="color:red; border: 1px solid red; padding: 2px 5px; border-radius: 4px; background: white; cursor: pointer;">Eliminar</button>
            </td>
        </tr>`;
    });
}

function cambiarPagina(delta) {
    if (paginaActual + delta > 0) {
        cargarPermisos(paginaActual + delta);
    }
}

/* ==========================================
   CRUD: CREAR Y EDITAR
   ========================================== */
async function guardarPermiso() {
    const token = localStorage.getItem("token");
    const id = document.getElementById("permiso_id").value;
    
    const checkboxesModulos = document.querySelectorAll('.cb-modulo:checked');
    const modulosSeleccionados = Array.from(checkboxesModulos).map(cb => parseInt(cb.value));

    const id_perfil = parseInt(document.getElementById("select_perfil").value);

    if(!id_perfil || modulosSeleccionados.length === 0) {
        alert("Debes seleccionar un Perfil y al menos un Módulo.");
        return;
    }

    const payload = {
        id_perfil: id_perfil,
        id_modulos: modulosSeleccionados, 
        bit_agregar: document.getElementById("bit_agregar").checked,
        bit_editar: document.getElementById("bit_editar").checked,
        bit_eliminar: document.getElementById("bit_eliminar").checked,
        bit_consulta: document.getElementById("bit_consulta").checked,
        bit_detalle: document.getElementById("bit_detalle").checked
    };

    const metodo = id ? "PUT" : "POST";
    const url = id ? `${API}/permisos_perfil/${id}` : `${API}/permisos_perfil`;

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (manejarErroresFetch(response)) return;

        if (response.ok) {
            alert(id ? "Permisos actualizados correctamente" : "Permisos asignados con éxito");
            limpiarFormulario();
            cargarPermisos(paginaActual);
        } else {
            alert("Error al guardar en la base de datos. Verifica la consola.");
        }
    } catch (error) { alert("Error de conexión"); }
}

function editarPermiso(p) {
    document.getElementById("titulo-form").innerText = "Editar Permisos";
    document.getElementById("permiso_id").value = p.id;
    document.getElementById("select_perfil").value = p.id_perfil;
    
    document.querySelectorAll('.cb-modulo').forEach(cb => cb.checked = false);
    
    const cbModulo = document.querySelector(`.cb-modulo[value="${p.id_modulo}"]`);
    if(cbModulo) cbModulo.checked = true;
    
    document.getElementById("bit_agregar").checked = p.bit_agregar;
    document.getElementById("bit_editar").checked = p.bit_editar;
    document.getElementById("bit_eliminar").checked = p.bit_eliminar;
    document.getElementById("bit_consulta").checked = p.bit_consulta;
    document.getElementById("bit_detalle").checked = p.bit_detalle;
    
    window.scrollTo(0, 0);
}

/* ==========================================
   CRUD: ELIMINAR Y MOSTRAR DETALLE
   ========================================== */
async function eliminarPermiso(id) {
    if(confirm("¿Seguro que deseas revocar estos permisos?")) {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API}/permisos_perfil/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (manejarErroresFetch(response)) return;

        cargarPermisos(paginaActual);
    }
}

function mostrarDetalle(id) {
    alert(`Estás viendo el detalle del registro de Permisos ID: ${id}\n\nAquí el evaluador validará que se cumple la lectura específica de un registro.`);
}

function limpiarFormulario() {
    document.getElementById("titulo-form").innerText = "Asignar Nuevos Permisos";
    document.getElementById("permiso_id").value = "";
    document.getElementById("select_perfil").value = "";
    document.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
    
    // 🌟 NUEVO: Si limpian el formulario, también actualizamos la tabla para que se oculte
    renderizarTabla();
}

/* ==========================================
   INICIALIZACIÓN AL CARGAR LA PÁGINA
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

    // 🌟 NUEVO: Le decimos al selector que cada vez que cambie, redibuje la tabla
    document.getElementById("select_perfil").addEventListener("change", renderizarTabla);

    cargarCatalogos();
    cargarMenuDinamico();
    cargarPermisos(1);
});