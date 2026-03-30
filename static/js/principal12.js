const API = "/api";

// Registros de prueba específicos para la pantalla 1.2
const registrosDemo = [
    { nombre: "Dato Especial 1.2 - A", descripcion: "Registro correspondiente al módulo 1.2", estado: "Activo" },
    { nombre: "Dato Especial 1.2 - B", descripcion: "Prueba de ocultamiento de botones", estado: "Inactivo" },
    { nombre: "Dato Especial 1.2 - C", descripcion: "Datos simulados correctamente", estado: "Activo" }
];

// Inicia la espera de los permisos cargados por seguridad.js
function esperarPermisosYRenderizar() {
    if (window.permisosPantalla) {
        configurarBotonAgregar();
        renderizarTabla(registrosDemo);
    } else {
        setTimeout(esperarPermisosYRenderizar, 50);
    }
}

// Oculta o muestra el botón "+ Agregar Nuevo Registro" dependiendo del permiso "agregar"
function configurarBotonAgregar() {
    const btnAgregar = document.getElementById("btn-agregar");
    if (!btnAgregar) return;

    // ¡CORRECCIÓN APLICADA AQUÍ! Ahora busca "agregar"
    if (window.permisosPantalla.agregar) {
        btnAgregar.style.display = "inline-block";
        btnAgregar.onclick = () => alert('Simulación: Agregando registro en 1.2...');
    } else {
        btnAgregar.style.display = "none";
    }
}

// Dibuja la tabla dinámica, oculta botones si no hay permisos y pone IDs consecutivos
function renderizarTabla(data) {
    const tabla = document.getElementById("tablaRegistros");
    if (!tabla) return;
    const permisos = window.permisosPantalla;

    tabla.innerHTML = data.map((item, index) => {
        const idSimulado = index + 1; // Genera ID consecutivo: 1, 2, 3...
        const colorEstado = item.estado === "Activo" ? "#10b981" : "#ef4444";
        
        // CONSTRUCCIÓN DE BOTONES DE ACCIÓN SEGÚN PERMISOS
        let botonesHTML = "";

        if (permisos.detalle) {
            botonesHTML += `<button onclick="alert('Ver')" style="border: 1px solid #3b82f6; color: #3b82f6; background: white; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">Ver</button>`;
        }
        if (permisos.editar) {
            botonesHTML += `<button onclick="alert('Editar')" style="border: 1px solid #f59e0b; color: #f59e0b; background: white; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">Editar</button>`;
        }
        if (permisos.eliminar) {
            botonesHTML += `<button onclick="alert('Eliminar')" style="border: 1px solid #ef4444; color: #ef4444; background: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Eliminar</button>`;
        }

        // Si no tiene ningún permiso, se muestra este texto
        if (botonesHTML === "") {
            botonesHTML = `<span style="color: #94a3b8; font-size: 13px;">Sin permisos</span>`;
        }

        return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 15px; color: #333;">${idSimulado}</td>
            <td style="padding: 15px; color: #333;">${item.nombre}</td>
            <td style="padding: 15px; color: #666;">${item.descripcion}</td>
            <td style="padding: 15px; color: ${colorEstado}; font-weight: bold;">${item.estado}</td>
            <td style="padding: 15px;">${botonesHTML}</td>
        </tr>
        `;
    }).join('');
}

// Carga el menú desde el backend y pinta el nombre de usuario
async function cargarMenuYUsuario() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    // Poner el nombre del usuario guardado
    const nombreGuardado = localStorage.getItem("nombre_usuario") || "Invitado";
    document.getElementById("nombre-usuario-nav").innerText = nombreGuardado;

    // Cargar menú dinámico
    try {
        const response = await fetch(`${API}/menu-dinamico`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.status === 401) {
            window.location.href = "/login.html";
            return;
        }

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
                    // Resaltar la página actual (ahora es Principal 1.2)
                    const style = (nombre === 'Principal 1.2') ? 'color: #4f46e5; font-weight: bold; text-decoration: none;' : 'color: #cbd5e1; text-decoration: none;';
                    htmlMenu += `<li><a style="${style}" href="/${link}">${nombre}</a></li>`;
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
    } catch (e) { console.error("Error cargando menú:", e); }
}

// Inicializar todo al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    cargarMenuYUsuario();
    esperarPermisosYRenderizar();
});