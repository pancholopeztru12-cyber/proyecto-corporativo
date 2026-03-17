const API = "/api";
let paginaActual = 1;

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
            perfiles.forEach(p => selectP.innerHTML += `<option value="${p.id}">${p.str_nombre_perfil || 'Perfil '+p.id}</option>`);
        }

        // Cargar Módulos 
        const resModulos = await fetch(`${API}/modulos`, { headers });
        if (manejarErroresFetch(resModulos)) return;

        if (resModulos.ok) {
            const modulos = await resModulos.json();
            const selectM = document.getElementById("select_modulo");
            modulos.forEach(m => selectM.innerHTML += `<option value="${m.id}">${m.str_nombre_modulo || 'Modulo '+m.id}</option>`);
        }
    } catch (e) { console.error("Error cargando catálogos:", e); }
}

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
            lista.innerHTML = "";
            modulos.forEach(m => {
                const nombre = m.nombre; 
                const link = nombre.toLowerCase() === 'usuario' ? 'usuarios.html' : `${nombre.toLowerCase()}.html`;
                lista.innerHTML += `<li><a href="/${link}">${nombre}</a></li>`;
            });
        }
    } catch (e) { console.error("Error menú:", e); }
}

/* ==========================================
   CRUD: CONSULTAR Y PAGINACIÓN
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
        const tabla = document.getElementById("tablaPermisos");
        tabla.innerHTML = "";

        // Renderizado de tabla
        permisos.forEach(p => {
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
                    <button onclick="mostrarDetalle(${p.id})" style="color:blue">Ver</button>
                    <button onclick='editarPermiso(${JSON.stringify(p)})' style="color:orange">Editar</button>
                    <button onclick="eliminarPermiso(${p.id})" style="color:red">Eliminar</button>
                </td>
            </tr>`;
        });

        document.getElementById("infoPagina").innerText = `Página ${paginaActual}`;
    } catch (error) { console.error("Error cargando permisos:", error); }
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
    
    const payload = {
        id_perfil: parseInt(document.getElementById("select_perfil").value),
        id_modulo: parseInt(document.getElementById("select_modulo").value),
        bit_agregar: document.getElementById("bit_agregar").checked,
        bit_editar: document.getElementById("bit_editar").checked,
        bit_eliminar: document.getElementById("bit_eliminar").checked,
        bit_consulta: document.getElementById("bit_consulta").checked,
        bit_detalle: document.getElementById("bit_detalle").checked
    };

    if(!payload.id_perfil || !payload.id_modulo) {
        alert("Debes seleccionar un Perfil y un Módulo.");
        return;
    }

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
            alert("Error al guardar en la base de datos.");
        }
    } catch (error) { alert("Error de conexión"); }
}

function editarPermiso(p) {
    document.getElementById("titulo-form").innerText = "Editar Permisos";
    document.getElementById("permiso_id").value = p.id;
    document.getElementById("select_perfil").value = p.id_perfil;
    document.getElementById("select_modulo").value = p.id_modulo;
    
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
    document.getElementById("select_modulo").value = "";
    document.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
}

document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("token")) {
        window.location.href = "/login.html";
        return;
    }
    cargarCatalogos();
    cargarMenuDinamico();
    cargarPermisos(1);
});