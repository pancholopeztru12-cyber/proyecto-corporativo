use dotenvy::dotenv;
// Ya no necesitamos SocketAddr de la misma forma, así que puedes quitarlo si quieres, 
// o dejarlo, pero usaremos un String formateado para más facilidad con las variables de entorno.
use tower_http::services::ServeDir;
use axum::Router; 

mod db;
mod handlers;
mod routes;
mod middleware;
mod models;

#[tokio::main]
async fn main() {
    dotenv().ok();

    // Conexión a la base de dato
    let pool = db::connect_db().await;

    println!("Conectado a PostgreSQL correctamente");

   // 2. CONSTRUCCIÓN DE LA APP
    let app = Router::new()
        // 👇 ESTA ES LA LÍNEA NUEVA: Redirige la raíz "/" hacia "/login.html"
        .route("/", axum::routing::get(|| async { axum::response::Redirect::permanent("/login.html") }))
        .nest_service("/uploads", ServeDir::new("uploads")) 
        .nest("/api", routes::create_routes(pool))
        .fallback_service(ServeDir::new("static"));

    // --- NUEVA LÓGICA PARA RENDER ---
    // Render inyecta una variable llamada "PORT". Si no la encuentra (como en tu PC local), usa "3000".
    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    
    // CRÍTICO: Debe ser "0.0.0.0" para aceptar conexiones externas en la nube.
    let addr = format!("0.0.0.0:{}", port);

    println!("Servidor corriendo en: http://{}", addr);

    // Creamos el listener con la nueva dirección
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();

    // 3. INICIO DEL SERVIDOR
    axum::serve(
        listener,
        app.into_make_service(), 
    )
    .await
    .unwrap();
}