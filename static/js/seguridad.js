// static/js/seguridad.js

(async function protegerRuta() {
    // 1. ¿Tiene su gafete (Token)? Si no, pa' fuera inmediatamente al Login.
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.replace("/login.html");
        return;
    }

    // Obtenemos el nombre exacto del archivo HTML en el que estamos
    let paginaOriginal = window.location.pathname.split("/").pop().toLowerCase();

    // Si estamos en la raíz, index, o no hay nombre de archivo, los dejamos pasar
    if (paginaOriginal === "index.html" || paginaOriginal === "") return;

    // Diccionario para las sub-páginas
    const subPaginas = {
        "nuevo_perfil.html": "perfiles.html",
        "nuevo_usuario.html": "usuarios.html"
    };

    // Traducimos la página actual a su página "padre" para validar permisos
    let paginaEvaluar = subPaginas[paginaOriginal] || paginaOriginal;

    // 2. ¿Tiene permiso para entrar a ESTE cuarto en específico?
    try {
        const response = await fetch("/api/menu-dinamico", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("token");
            window.location.replace("/login.html");
            return;
        }

        if (response.ok) {
            const modulosPermitidos = await response.json();
            
            // Logueamos para ver qué está pasando por debajo
            console.log(`Intentando acceder a: ${paginaOriginal}`);
            console.log(`Evaluando permisos contra: ${paginaEvaluar}`);
            console.log("Módulos de este usuario:", modulosPermitidos);

            const tienePermiso = modulosPermitidos.some(m => {
                const nombreModulo = (m.nombre || m.str_nombre_modulo || m.str_nombre || "").toLowerCase().replace(/\s+/g, '');
                
                // Mapeo directo y sencillo
                if (nombreModulo === 'usuario') return paginaEvaluar === 'usuarios.html';
                if (nombreModulo === 'perfil') return paginaEvaluar === 'perfiles.html';
                if (nombreModulo === 'modulo' || nombreModulo === 'módulo') return paginaEvaluar === 'modulos.html';
                if (nombreModulo === 'permisosperfil' || nombreModulo === 'permisos-perfil') return paginaEvaluar === 'permisosperfil.html' || paginaEvaluar === 'permisos_perfil.html';
                
                // Si no es ninguna de las excepciones, validamos el nombre directo
                return `${nombreModulo}.html` === paginaEvaluar;
            });

            if (!tienePermiso) {
                console.warn(`ACCESO DENEGADO: El usuario no tiene el módulo correspondiente para ver ${paginaEvaluar}`);
                alert("⛔ Acceso Denegado: Tu perfil no tiene permisos para ver esta pantalla.");
                window.location.replace("/index.html"); 
            }
        }
    } catch (error) {
        console.error("Error verificando seguridad:", error);
        // En caso de error de red, no bloqueamos la página para no romper el sistema
    }
})();