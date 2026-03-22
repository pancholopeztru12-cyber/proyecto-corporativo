async function login() {
    const usuarioEl = document.getElementById("usuario");
    const passwordEl = document.getElementById("password");

    if (!usuarioEl || !passwordEl) {
        console.error("Faltan elementos en el DOM");
        return;
    }

    const usuario = usuarioEl.value.trim();
    const password = passwordEl.value.trim();
    
    // 1. Obtenemos el token que genera el widget de Google
    const recaptchaToken = grecaptcha.getResponse();

    if (!usuario || !password) {
        alert("Usuario y contraseña son obligatorios");
        return;
    }

    // 2. Validamos que el usuario haya hecho el captcha
    if (recaptchaToken.length === 0) {
        alert("Por favor, marca la casilla de 'No soy un robot'.");
        return;
    }

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                usuario: usuario,  
                password: password, 
                captcha: recaptchaToken 
            })
        });

        const contentType = response.headers.get("content-type");
        let data = {};
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        }

        if (response.ok) {
            // Guardamos el token
            localStorage.setItem("token", data.token);
            
            // NUEVO: Guardamos el nombre del usuario que nos mandó el backend
            localStorage.setItem("nombre_usuario", data.nombre);
            
            alert("Bienvenido al sistema");
            window.location.href = "/usuarios.html";
        } else {
            alert(data.message || "Credenciales inválidas o usuario inactivo");
            // 3. Reiniciamos el widget si hubo un error en el login
            grecaptcha.reset();
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error crítico: No se pudo conectar con el servidor");
    }
}