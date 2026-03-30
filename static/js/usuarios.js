const API = "/api";
let paginaActual = 1;
let listaUsuariosData = []; 

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
   LÓGICA DEL MODAL (Ventana Emergente)
   ========================================== */
function alternarCamposLectura(soloLectura) {
    const campos = ["nuevo_usuario", "nuevo_password", "nuevo_perfil", "nuevo_correo", "nuevo_celular", "nuevo_estado", "imagen_usuario"];
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = soloLectura;
    });
    
    // Ocultamos el botón guardar si es solo lectura
    const btnGuardar = document.getElementById("btn-crear");
    if (btnGuardar) {
        btnGuardar.style.display = soloLectura ? "none" : "block";
    }
}

function abrirModalUsuario() {
    // 🛡️ CANDADO LÓGICO DE PERMISOS
    if (window.permisosPantalla && window.permisosPantalla.agregar === false) {
        alert("⛔ Acción denegada: No tienes permiso para crear usuarios.");
        return;
    }

    limpiarFormularioUsuario();
    alternarCamposLectura(false); // Aseguramos que los campos se puedan editar
    document.getElementById("modal-titulo").innerText = "Crear Nuevo Usuario";
    document.getElementById("modal-usuario").style.display = "block";
}

function cerrarModalUsuario() {
    document.getElementById("modal-usuario").style.display = "none";
}

/* ==========================================
   CARGAR USUARIOS Y ESPERAR PERMISOS
   ========================================== */
async function cargarUsuarios(pagina = 1) {
    paginaActual = pagina;
    const token = localStorage.getItem("token");
    const tabla = document.getElementById("tablaUsuarios");

    if (tabla) {
        tabla.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #64748b; font-weight: bold;">⏳ Cargando usuarios...</td></tr>`;
    }

    try {
        const response = await fetch(`${API}/usuarios?pagina=${paginaActual}`, { 
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (manejarErroresFetch(response)) return;

        listaUsuariosData = await response.json();
        
        // ⏳ EL RELOJITO: Esperamos a que seguridad.js termine de leer permisos
        esperarPermisosYRenderizar();

    } catch (error) {
        console.error("Error cargando usuarios:", error);
        if (tabla) {
            tabla.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: red;">❌ Error al cargar los datos.</td></tr>`;
        }
    }
}

function esperarPermisosYRenderizar() {
    if (window.permisosPantalla) {
        renderizarTabla(listaUsuariosData);
    } else {
        setTimeout(esperarPermisosYRenderizar, 50);
    }
}

function renderizarTabla(data) {
    const tabla = document.getElementById("tablaUsuarios");
    if (!tabla) return;
    
    tabla.innerHTML = "";
    const permisos = window.permisosPantalla; // Ya sabemos que existe gracias al relojito

    if (data.length === 0) {
        tabla.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #64748b;">No hay usuarios registrados o no coinciden con la búsqueda.</td></tr>`;
        return;
    }

    data.forEach(u => {
        const fotoUrl = u.imagen ? `/uploads/usuarios/${u.imagen}` : '/img/default.png';
        const esActivo = u.id_estado_usuario === true || u.id_estado_usuario === "true" || u.id_estado_usuario === 1;
        const estadoTexto = esActivo ? "Activo" : "Inactivo";
        const estadoColor = esActivo ? "#10b981" : "#ef4444"; 
        
        const nombreMostrar = u.nombre || u.str_nombre_usuario || "N/A";
        const perfilMostrar = u.perfil || "Sin Perfil"; 
        const emailMostrar = u.email || u.str_correo || "N/A";
        const celularMostrar = u.celular || u.str_numero_celular || "N/A";

        // 🎨 CONSTRUCCIÓN DINÁMICA DE BOTONES (FLEXBOX)
        let botones = `<div style="display: flex; gap: 8px; justify-content: center;">`;

        if (permisos.detalle) {
            botones += `<button class="btn-detalle" onclick="verDetalleUsuario(${u.id})" style="color:#0ea5e9; border: 1px solid #0ea5e9; padding: 4px 8px; border-radius: 4px; background: transparent; cursor: pointer;">🔍 Detalle</button>`;
        }
        if (permisos.editar) {
            botones += `<button class="btn-editar" onclick="editarUsuario(${u.id})" style="color:orange; border: 1px solid orange; padding: 4px 8px; border-radius: 4px; background: transparent; cursor: pointer;">✏️ Editar</button>`;
        }
        if (permisos.eliminar) {
            botones += `<button class="btn-eliminar" onclick="eliminarUsuario(${u.id})" style="color:red; border: 1px solid red; padding: 4px 8px; border-radius: 4px; background: transparent; cursor: pointer;">🗑️ Eliminar</button>`;
        }
        
        botones += `</div>`;
        
        tabla.innerHTML += `
        <tr>
            <td><img src="${fotoUrl}" class="user-img" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #334155;"></td>
            <td><strong>${nombreMostrar}</strong></td>
            <td><span style="background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 12px; font-size: 0.85rem; font-weight: bold;">${perfilMostrar}</span></td>
            <td>${emailMostrar}</td>
            <td>${celularMostrar}</td>
            <td><span style="color: ${estadoColor}; font-weight: 600; background: ${esActivo ? '#ecfdf5' : '#fef2f2'}; padding: 4px 8px; border-radius: 6px; font-size: 0.85rem;">${estadoTexto}</span></td>
            <td>${botones}</td>
        </tr>`;
    });

    const infoPagina = document.getElementById("infoPagina");
    if (infoPagina) infoPagina.innerText = `Página ${paginaActual}`;
}

/* === NUEVO: FUNCIÓN PARA FILTRAR === */
function filtrarUsuarios() {
    const input = document.getElementById("inputFiltroUsuarios");
    if (!input) return;

    const termino = input.value.toLowerCase().trim();
    
    const resultados = listaUsuariosData.filter(u => {
        const nombre = (u.nombre || u.str_nombre_usuario || "").toLowerCase();
        const correo = (u.email || u.str_correo || "").toLowerCase();
        const celular = (u.celular || u.str_numero_celular || "").toLowerCase();
        
        return nombre.includes(termino) || correo.includes(termino) || celular.includes(termino);
    });

    renderizarTabla(resultados);
}

/* === NUEVO: FUNCIÓN PARA EXPORTAR A EXCEL (CSV) === */
function exportarExcel() {
    if (listaUsuariosData.length === 0) {
        alert("⚠️ No hay datos para exportar en esta página.");
        return;
    }

    let csvContent = "ID,Nombre,Perfil,Correo,Celular,Estado\n";

    listaUsuariosData.forEach(u => {
        const id = u.id || "";
        const nombre = u.nombre || u.str_nombre_usuario || "N/A";
        const perfil = u.perfil || "Sin Perfil";
        const correo = u.email || u.str_correo || "N/A";
        const celular = u.celular || u.str_numero_celular || "N/A";
        const esActivo = u.id_estado_usuario === true || u.id_estado_usuario === "true" || u.id_estado_usuario === 1;
        const estado = esActivo ? "Activo" : "Inactivo";
        
        csvContent += `${id},"${nombre}","${perfil}","${correo}","${celular}","${estado}"\n`;
    });

    // \uFEFF asegura que Excel lea los acentos y ñ correctamente (UTF-8)
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Usuarios_Pagina_${paginaActual}.csv`); 
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/* ==========================================
   VER DETALLE (MODO SOLO LECTURA)
   ========================================== */
function verDetalleUsuario(id) {
    if (window.permisosPantalla && window.permisosPantalla.detalle === false) {
        alert("⛔ Acción denegada: No tienes permiso para ver detalles.");
        return;
    }

    const u = listaUsuariosData.find(user => user.id === id);
    if (!u) return;

    // Llenamos los datos
    document.getElementById("usuario_id").value = u.id;
    document.getElementById("nuevo_usuario").value = u.nombre || u.str_nombre_usuario || "";
    document.getElementById("nuevo_password").value = ""; 
    document.getElementById("nuevo_perfil").value = u.id_perfil || "";
    document.getElementById("nuevo_correo").value = u.email || u.str_correo || "";
    document.getElementById("nuevo_celular").value = u.celular || u.str_numero_celular || "";
    
    const esActivo = u.id_estado_usuario === true || u.id_estado_usuario === "true" || u.id_estado_usuario === 1;
    document.getElementById("nuevo_estado").value = esActivo ? "true" : "false";

    // Bloqueamos los campos
    alternarCamposLectura(true);

    document.getElementById("modal-titulo").innerText = `🔍 Detalles del Usuario (Solo Lectura)`;
    document.getElementById("modal-usuario").style.display = "block";
}

/* ==========================================
   EDITAR USUARIO (Cargar datos al modal)
   ========================================== */
function editarUsuario(id) {
    // 🛡️ CANDADO LÓGICO
    if (window.permisosPantalla && window.permisosPantalla.editar === false) {
        alert("⛔ Acción denegada: No tienes permiso para editar usuarios.");
        return;
    }

    const u = listaUsuariosData.find(user => user.id === id);
    if (!u) return;

    document.getElementById("usuario_id").value = u.id;
    document.getElementById("nuevo_usuario").value = u.nombre || u.str_nombre_usuario || "";
    document.getElementById("nuevo_password").value = ""; 
    document.getElementById("nuevo_perfil").value = u.id_perfil || "";
    document.getElementById("nuevo_correo").value = u.email || u.str_correo || "";
    document.getElementById("nuevo_celular").value = u.celular || u.str_numero_celular || "";
    
    const esActivo = u.id_estado_usuario === true || u.id_estado_usuario === "true" || u.id_estado_usuario === 1;
    document.getElementById("nuevo_estado").value = esActivo ? "true" : "false";

    // Habilitamos los campos por si antes abrieron "Detalles"
    alternarCamposLectura(false);

    document.getElementById("modal-titulo").innerText = `Editar Usuario (ID: ${id})`;
    document.getElementById("modal-usuario").style.display = "block";
}

function limpiarFormularioUsuario() {
    document.getElementById("usuario_id").value = "";
    document.getElementById("nuevo_usuario").value = "";
    document.getElementById("nuevo_password").value = "";
    document.getElementById("nuevo_perfil").value = "";
    document.getElementById("nuevo_correo").value = "";
    document.getElementById("nuevo_celular").value = "";
    document.getElementById("nuevo_estado").value = "true";
    document.getElementById("imagen_usuario").value = "";
}

/* ==========================================
   GUARDAR (CREAR O ACTUALIZAR) USUARIO 
   ========================================== */
async function guardarUsuario() {
    // 🛡️ NUEVO: VALIDACIONES DE LONGITUD Y CAMPOS VACÍOS
    const nombre = document.getElementById("nuevo_usuario").value.trim();
    const password = document.getElementById("nuevo_password").value;
    const perfil = document.getElementById("nuevo_perfil").value;
    const email = document.getElementById("nuevo_correo").value.trim();
    const celular = document.getElementById("nuevo_celular").value.trim();

    if (!nombre || nombre.length < 3 || nombre.length > 50) {
        alert("⚠️ El nombre de usuario es obligatorio y debe tener entre 3 y 50 caracteres.");
        return;
    }
    if (!perfil) {
        alert("⚠️ Debe seleccionar un perfil obligatoriamente.");
        return;
    }
    if (password !== "" && (password.length < 6 || password.length > 50)) {
        alert("⚠️ La contraseña debe tener entre 6 y 50 caracteres.");
        return;
    }
    if (email.length > 100) {
        alert("⚠️ El correo electrónico no puede exceder los 100 caracteres.");
        return;
    }
    if (celular && celular.length > 15) {
        alert("⚠️ El número de celular es demasiado largo. Máximo 15 caracteres.");
        return;
    }

    // Si pasa las validaciones, construimos el FormData
    const token = localStorage.getItem("token");
    const id = document.getElementById("usuario_id").value; 
    
    const formData = new FormData();
    formData.append("str_nombre_usuario", nombre);
    
    if (password) {
        formData.append("str_pwd", password);
    }

    formData.append("id_perfil", perfil);
    formData.append("str_correo", email);
    formData.append("str_numero_celular", celular);
    formData.append("id_estado_usuario", document.getElementById("nuevo_estado").value);

    const inputImagen = document.getElementById("imagen_usuario");
    if (inputImagen.files.length > 0) {
        formData.append("imagen_archivo", inputImagen.files[0]);
    }

    const metodo = id ? "PUT" : "POST";
    const url = id ? `${API}/usuarios/${id}` : `${API}/usuarios`;

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        if (manejarErroresFetch(response)) return;

        if (response.ok) {
            alert(id ? "Usuario actualizado con éxito" : "Usuario guardado con éxito");
            cerrarModalUsuario(); 
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
                const nombrePerfil = p.nombre || p.str_nombre_perfil || "Desconocido";
                select.innerHTML += `<option value="${p.id}">${nombrePerfil}</option>`;
            });
        }
    } catch (e) { console.error("Error perfiles:", e); }
}

/* ==========================================
   MENÚ DINÁMICO
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
   ELIMINAR USUARIO
   ========================================== */
async function eliminarUsuario(id) {
    // 🛡️ CANDADO LÓGICO
    if (window.permisosPantalla && window.permisosPantalla.eliminar === false) {
        alert("⛔ Acción denegada: No tienes permiso para eliminar usuarios.");
        return;
    }

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

    const nombreGuardado = localStorage.getItem("nombre_usuario") || "Usuario";
    const spanNombre = document.getElementById("nombre-usuario-nav");
    if (spanNombre) {
        spanNombre.innerText = nombreGuardado;
    }

    // Cerrar el modal si hacen clic en el fondo borroso
    window.onclick = function(event) {
        const modal = document.getElementById('modal-usuario');
        if (event.target === modal) cerrarModalUsuario();
    }

    cargarPerfiles();
    cargarUsuarios(1);
    cargarMenuDinamico();
});

/* ==========================================
   PAGINACIÓN
   ========================================== */
function cambiarPagina(delta) {
    const nuevaPagina = paginaActual + delta;
    if (nuevaPagina > 0) {
        cargarUsuarios(nuevaPagina);
    }
}