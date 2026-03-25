const API = "/api/perfiles";
const API_BASE = "/api";
let listaPerfilesData = []; // Guardamos los perfiles en memoria para editarlos

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
            listaPerfilesData = data; // Guardamos en memoria
            const tabla = document.getElementById("tablaPerfiles");
            
            tabla.innerHTML = data.map(p => {
                const nombrePerfil = p.str_nombre_perfil || p.nombre || "Sin nombre";
                return `
                <tr>
                    <td><strong>${p.id}</strong></td>
                    <td><span style="background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 12px; font-weight: bold;">${nombrePerfil}</span></td>
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

/* === EDITAR PERFIL (Llenar formulario) === */
function editarPerfil(id) {
    const p = listaPerfilesData.find(perfil => perfil.id === id);
    if (!p) return;

    document.getElementById("perfil_id").value = p.id;
    document.getElementById("nuevo_nombre_perfil").value = p.str_nombre_perfil || p.nombre || "";
    
    // Encendemos o apagamos el switch dependiendo de lo que venga de la base de datos
    document.getElementById("esAdministrador").checked = p.bit_administrador || false; 
    
    document.querySelector("#formulario h3").innerText = `Editar Perfil (ID: ${id})`;
    window.scrollTo(0, 0);
}

/* === LIMPIAR FORMULARIO === */
function limpiarFormularioPerfil() {
    document.getElementById("perfil_id").value = "";
    document.getElementById("nuevo_nombre_perfil").value = "";
    
    // Apagamos el switch por defecto al limpiar
    document.getElementById("esAdministrador").checked = false;

    document.querySelector("#formulario h3").innerText = "Crear / Editar Perfil";
}

/* === GUARDAR (CREAR O ACTUALIZAR) PERFIL === */
async function guardarPerfil() {
    const token = localStorage.getItem("token");
    const id = document.getElementById("perfil_id").value;
    const nombrePerfil = document.getElementById("nuevo_nombre_perfil").value;
    const esAdmin = document.getElementById("esAdministrador").checked; // Leemos si el switch está activado

    if(!nombrePerfil.trim()) {
        alert("El nombre del perfil es obligatorio");
        return;
    }

    // Adaptamos el body según tu backend y le agregamos el es_administradoooor
    const bodyData = { 
        str_nombre_perfil: nombrePerfil,
        bit_administrador: esAdmin // ¡Ahora coinciden exactamente!
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
            alert(id ? "Perfil actualizado con éxito" : "Perfil creado con éxito");
            limpiarFormularioPerfil();
            cargarPerfiles();
        } else {
            alert("Error al guardar perfil.");
        }
    } catch (error) {
        alert("Error de conexión con el servidor");
    }
}

/* === ELIMINAR PERFIL === */
async function eliminarPerfil(id) {
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

    cargarPerfiles();
    cargarMenuDinamico();
});