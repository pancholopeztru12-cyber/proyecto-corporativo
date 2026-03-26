const API = "/api";

function manejarErroresFetch(response) {
    if (response.status === 401) { window.location.href = "/login.html"; return true; }
    if (response.status === 403 || response.status >= 500) { window.location.href = "/error.html"; return true; }
    return false; 
}

/* Reutilizamos tu función para cargar el menú lateral */
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

/* Inicializar al cargar */
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    // Poner el nombre del usuario en la barra superior y en el mensaje gigante
    const nombreGuardado = localStorage.getItem("nombre_usuario") || "Usuario";
    
    const spanNombreNav = document.getElementById("nombre-usuario-nav");
    if (spanNombreNav) spanNombreNav.innerText = nombreGuardado;
    
    const spanNombreMain = document.getElementById("nombre-usuario-main");
    if (spanNombreMain) spanNombreMain.innerText = nombreGuardado;

    cargarMenuDinamico();
});