// auth.js
function verificarAutenticacion() {
    const token = localStorage.getItem("token");
    
    if (!token) {
        // Redireccionar si no hay token
        window.location.href = "/login.html";
        return;
    }

    // Opcional: Decodificar el JWT para ver si ha expirado
    const payload = JSON.parse(atob(token.split('.')[1]));
    const ahora = Math.floor(Date.now() / 1000);

    if (payload.exp < ahora) {
        localStorage.removeItem("token");
        window.location.href = "/login.html";
    }
}

// Ejecutar al cargar cualquier página protegida
verificarAutenticacion();