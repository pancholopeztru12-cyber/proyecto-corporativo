// static/js/seguridad.js

(async function protegerRuta() {
    // 1. ¿Tiene su gafete (Token)? Si no, pa' fuera inmediatamente.
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.replace("/login.html");
        return;
    }

    // Obtenemos el nombre exacto del archivo HTML en el que estamos
    let paginaOriginal = window.location.pathname.split("/").pop().toLowerCase();

    // Si estamos en la raíz o index, los dejamos pasar
    if (paginaOriginal === "index.html" || paginaOriginal === "") return;

    // Diccionario para las sub-páginas
    const subPaginas = {
        "nuevo_perfil.html": "perfiles.html",
        "nuevo_usuario.html": "usuarios.html"
    };

    let paginaEvaluar = subPaginas[paginaOriginal] || paginaOriginal;

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
            
            // 2. BUSCAMOS EXACTAMENTE EL MÓDULO ACTUAL Y SUS PERMISOS
            const moduloActual = modulosPermitidos.find(m => {
                const nombreModulo = (m.nombre || m.str_nombre_modulo || m.str_nombre || "").toLowerCase().replace(/\s+/g, '');
                
                if (nombreModulo === 'usuario') return paginaEvaluar === 'usuarios.html';
                if (nombreModulo === 'perfil') return paginaEvaluar === 'perfiles.html';
                if (nombreModulo === 'modulo' || nombreModulo === 'módulo') return paginaEvaluar === 'modulos.html';
                if (nombreModulo === 'permisosperfil' || nombreModulo === 'permisos-perfil') return paginaEvaluar === 'permisosperfil.html' || paginaEvaluar === 'permisos_perfil.html';
                
                return `${nombreModulo}.html` === paginaEvaluar;
            });

            // 3. SI NO TIENE EL MÓDULO ASIGNADO, LO EXPULSAMOS
            if (!moduloActual) {
                console.warn(`ACCESO DENEGADO: Módulo no encontrado para ${paginaEvaluar}`);
                alert("⛔ Acceso Denegado: Tu perfil no tiene permisos para ver esta pantalla.");
                window.location.replace("/index.html"); 
                return;
            }

            // ==============================================================
            // 4. LA MAGIA: OCULTAR BOTONES CRUD BASADO EN PERMISOS
            // ==============================================================
            console.log("Permisos para esta pantalla:", moduloActual);
            
            let estilosOcultos = "";

            // Si no tiene permiso de agregar, ocultamos los botones
            if (moduloActual.agregar === false) {
                estilosOcultos += `
                    .btn-agregar, 
                    .btn-nuevo, 
                    [id*="nuevo"], 
                    [id*="agregar"] { display: none !important; }
                `;
            }

            // Si no tiene permiso de editar, ocultamos los botones amarillos
            if (moduloActual.editar === false) {
                estilosOcultos += `
                    .btn-editar, 
                    [id*="editar"] { display: none !important; }
                `;
            }

            // Si no tiene permiso de eliminar, ocultamos los botones rojos
            if (moduloActual.eliminar === false) {
                estilosOcultos += `
                    .btn-eliminar, 
                    [id*="eliminar"] { display: none !important; }
                `;
            }

            // Inyectamos el CSS dinámico en la página
            if (estilosOcultos !== "") {
                const styleEl = document.createElement("style");
                styleEl.innerHTML = estilosOcultos;
                document.head.appendChild(styleEl);
            }
            
            // Guardamos los permisos en global por si tus scripts JS quieren usarlos
            window.permisosPantalla = moduloActual;
        }
    } catch (error) {
        console.error("Error verificando seguridad:", error);
    }
})();