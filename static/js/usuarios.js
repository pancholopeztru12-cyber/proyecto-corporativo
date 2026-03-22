const API = "/api";
let paginaActual = 1;

/* ==========================================
   FUNCIÓN GLOBAL PARA MANEJAR ERRORES
   ========================================== */
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
   CARGAR USUARIOS
   ========================================== */
async function cargarUsuarios(pagina = 1) {
    paginaActual = pagina;
    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API}/usuarios?pagina=${paginaActual}`, { 
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (manejarErroresFetch(response)) return;

        const usuarios = await response.json();
        const tabla = document.getElementById("tablaUsuarios");
        tabla.innerHTML = "";

        usuarios.forEach(u => {
            const fotoUrl = u.imagen ? `/uploads/usuarios/${u.imagen}` : '/img/default.png';
            
            const esActivo = u.id_estado_usuario === true || u.id_estado_usuario === "true" || u.id_estado_usuario === 1;
            const estadoTexto = esActivo ? "Activo" : "Inactivo";
            const estadoColor = esActivo ? "#10b981" : "#ef4444"; 
            
            const nombreMostrar = u.nombre || u.str_nombre_usuario || "N/A";
            const perfilMostrar = u.perfil || "Sin Perfil"; // NUEVO
            const emailMostrar = u.email || u.str_correo || "N/A";
            const celularMostrar = u.celular || u.str_numero_celular || "N/A";
            
            tabla.innerHTML += `
            <tr>
                <td><img src="${fotoUrl}" class="user-img" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;"></td>
                <td>${nombreMostrar}</td>
                <td><span style="background: #e0e7ff; color: #4338ca; padding: 4px 8px; border-radius: 12px; font-size: 0.85rem; font-weight: bold;">${perfilMostrar}</span></td>
                <td>${emailMostrar}</td>
                <td>${celularMostrar}</td>
                <td style="color: ${estadoColor}; font-weight: 600;">${estadoTexto}</td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarUsuario(${u.id})">Eliminar</button>
                </td>
            </tr>`;
        });

        document.getElementById("infoPagina").innerText = `Página ${paginaActual}`;

    } catch (error) {
        console.error("Error cargando usuarios:", error);
    }
}

/* ==========================================
   CREAR USUARIO (CON IMAGEN Y ESTADO)
   ========================================== */
async function crearUsuario() {
    const token = localStorage.getItem("token");
    
    const formData = new FormData();
    formData.append("str_nombre_usuario", document.getElementById("nuevo_usuario").value);
    formData.append("str_pwd", document.getElementById("nuevo_password").value);
    formData.append("id_perfil", document.getElementById("nuevo_perfil").value);
    formData.append("str_correo", document.getElementById("nuevo_correo").value);
    formData.append("str_numero_celular", document.getElementById("nuevo_celular").value);
    
    // NUEVO: AGREGAMOS EL ESTADO AL FORMULARIO
    formData.append("id_estado_usuario", document.getElementById("nuevo_estado").value);

    const inputImagen = document.getElementById("imagen_usuario");
    if (inputImagen.files.length > 0) {
        formData.append("imagen_archivo", inputImagen.files[0]);
    }

    if(!formData.get("str_nombre_usuario") || !formData.get("id_perfil")) {
        alert("Nombre y Perfil son obligatorios");
        return;
    }

    try {
        const response = await fetch(`${API}/usuarios`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        if (manejarErroresFetch(response)) return;

        if (response.ok) {
            alert("Usuario guardado con éxito");
            // Limpiamos los campos
            document.getElementById("nuevo_usuario").value = "";
            document.getElementById("nuevo_password").value = "";
            document.getElementById("nuevo_correo").value = "";
            document.getElementById("nuevo_celular").value = "";
            document.getElementById("imagen_usuario").value = "";
            
            cargarUsuarios(paginaActual);
        } else {
            alert("Error al guardar usuario. Verifique los datos.");
        }
    } catch (error) {
        alert("Error de conexión con el servidor");
    }
}

/* ==========================================
   CARGAR PERFILES (Para el Select)
   ========================================== */
async function cargarPerfiles() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API}/perfiles`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (manejarErroresFetch(response)) return;

        if (response.ok) {
            const perfiles = await response.json();
            const select = document.getElementById("nuevo_perfil");
            select.innerHTML = '<option value="">Seleccione Perfil</option>';
            perfiles.forEach(p => {
                // Adaptado por si tu API devuelve id y nombre o str_nombre_perfil
                const nombrePerfil = p.nombre || p.str_nombre_perfil || "Desconocido";
                select.innerHTML += `<option value="${p.id}">${nombrePerfil}</option>`;
            });
        }
    } catch (e) { console.error("Error perfiles:", e); }
}

/* ==========================================
   MENÚ DINÁMICO Y PERMISOS DE BOTONES (JERÁRQUICO)
   ========================================== */
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
            let moduloActual = null;

            const menuSeguridad = [];
            const menuPrincipal1 = [];
            const menuPrincipal2 = [];

            modulos.forEach(m => {
                const nombre = m.nombre || m.str_nombre_modulo || m.str_nombre; 
                if (!nombre) return;

                if (nombre.toLowerCase() === 'usuario') {
                    if (m.id === 4 || !moduloActual) moduloActual = m;
                }

                const nombreLow = nombre.toLowerCase();
                if (["perfil", "módulo", "modulo", "permisos-perfil", "permisosperfil", "usuario"].includes(nombreLow)) {
                    menuSeguridad.push(nombre);
                } else if (["principal 1.1", "principal 1.2"].includes(nombreLow)) {
                    menuPrincipal1.push(nombre);
                } else if (["principal 2.1", "principal 2.2"].includes(nombreLow)) {
                    menuPrincipal2.push(nombre);
                } else {
                    menuSeguridad.push(nombre); 
                }
            });

            let htmlMenu = "";

            if (menuSeguridad.length > 0) {
                htmlMenu += `<li><strong style="color:#333;">Seguridad</strong><ul style="list-style:circle; padding-left:20px; margin-top:5px;">`;
                menuSeguridad.forEach(nombre => {
                    const link = nombre.toLowerCase() === 'usuario' ? 'usuarios.html' : `${nombre.toLowerCase().replace(" ", "")}.html`;
                    htmlMenu += `<li><a href="/${link}">${nombre}</a></li>`;
                });
                htmlMenu += `</ul></li>`;
            }

            if (menuPrincipal1.length > 0) {
                htmlMenu += `<li style="margin-top:15px;"><strong style="color:#333;">Principal 1</strong><ul style="list-style:circle; padding-left:20px; margin-top:5px;">`;
                menuPrincipal1.forEach(nombre => {
                    const link = `${nombre.toLowerCase().replace(" ", "")}.html`;
                    htmlMenu += `<li><a href="/${link}">${nombre}</a></li>`;
                });
                htmlMenu += `</ul></li>`;
            }

            if (menuPrincipal2.length > 0) {
                htmlMenu += `<li style="margin-top:15px;"><strong style="color:#333;">Principal 2</strong><ul style="list-style:circle; padding-left:20px; margin-top:5px;">`;
                menuPrincipal2.forEach(nombre => {
                    const link = `${nombre.toLowerCase().replace(" ", "")}.html`;
                    htmlMenu += `<li><a href="/${link}">${nombre}</a></li>`;
                });
                htmlMenu += `</ul></li>`;
            }

            lista.innerHTML = htmlMenu;

            if (moduloActual) {
                const noPuedeAgregar = (moduloActual.agregar === false || moduloActual.agregar === 0 || moduloActual.bit_agregar === false || moduloActual.bit_agregar === 0);
                const noPuedeEliminar = (moduloActual.eliminar === false || moduloActual.eliminar === 0 || moduloActual.bit_eliminar === false || moduloActual.bit_eliminar === 0);

                const btnCrear = document.getElementById("btn-crear") || document.querySelector('.btn-success');
                if (btnCrear) {
                    btnCrear.style.display = noPuedeAgregar ? "none" : "block";
                }

                if (noPuedeEliminar) {
                    const estilo = document.createElement('style');
                    estilo.innerHTML = `.btn-eliminar { display: none !important; }`;
                    document.head.appendChild(estilo);
                }
            }
        }
    } catch (e) { console.error("Error menú:", e); }
}

/* ==========================================
   ELIMINAR USUARIO (AHORA SERÁ ELIMINACIÓN LÓGICA)
   ========================================== */
async function eliminarUsuario(id) {
    if(confirm("¿Seguro que deseas desactivar este usuario?")) {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API}/usuarios/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (manejarErroresFetch(response)) return;

        cargarUsuarios(paginaActual);
    }
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
    cargarPerfiles();
    cargarUsuarios(1);
    cargarMenuDinamico();
});