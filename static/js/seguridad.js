// static/js/seguridad.js

(async function protegerRuta() {
    // 1. ¿Tiene su gafete (Token)? Si no, pa' fuera inmediatamente al Login.
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.replace("/login.html"); // replace evita que regresen con la flecha de "Atrás"
        return;
    }

    // Si estamos en el index o dashboard principal, los dejamos pasar
    const paginaActual = window.location.pathname.split("/").pop().toLowerCase();
    if (paginaActual === "index.html" || paginaActual === "") return;

    // 2. ¿Tiene permiso para entrar a ESTE cuarto en específico?
    try {
        const response = await fetch("/api/menu-dinamico", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        // Si el token es falso o ya caducó
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("token");
            window.location.replace("/login.html");
            return;
        }

        if (response.ok) {
            const modulosPermitidos = await response.json();
            console.log("Página actual:", paginaActual, "Módulos permitidos:", modulosPermitidos);
            
            // Comparamos el nombre de la página actual con los módulos que le devolvió la BD
            const tienePermiso = modulosPermitidos.some(m => {
                const nombreModulo = (m.nombre || m.str_nombre_modulo || m.str_nombre || "").toLowerCase().replace(/\s+/g, '');
                
                // Aplicamos las mismas excepciones de nombres que tienes en tu menú
                return `${nombreModulo}.html` === paginaActual || 
                       (nombreModulo === 'usuario' && paginaActual === 'usuarios.html') ||
                       (nombreModulo === 'perfil' && paginaActual === 'perfiles.html') ||
                       (nombreModulo === 'modulo' && paginaActual === 'modulos.html') ||
                       (nombreModulo === 'módulo' && paginaActual === 'modulos.html');
            });

            // Si la página que quiere ver no está en su lista de permisos...
            if (!tienePermiso) {
                alert("⛔ Acceso Denegado: Tu perfil no tiene permisos para ver esta pantalla.");
                window.location.replace("/index.html"); // Lo mandamos al inicio
            }
        }
    } catch (error) {
        console.error("Error verificando seguridad:", error);
    }
})();