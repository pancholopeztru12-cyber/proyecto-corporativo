use dotenvy::dotenv;
use std::net::SocketAddr;
use tower_http::services::ServeDir;
use axum::Router; // 1. IMPORTACIÓN FALTANTE

mod db;
mod handlers;
mod routes;
mod middleware;
mod models;

#[tokio::main]
async fn main() {
    dotenv().ok();

    // Conexión a la base de datos
    let pool = db::connect_db().await;

    println!("Conectado a PostgreSQL correctamente");

    // 2. CONSTRUCCIÓN DE LA APP
    // Combinamos los servicios de archivos con las rutas de la API
    let app = Router::new()
        // Servir carpeta de imágenes (requisito para fotos de usuario)
        .nest_service("/uploads", ServeDir::new("uploads")) 
        // Unir las rutas que definiste en routes.rs y pasarles el pool de la DB
        .nest("/api", routes::create_routes(pool)) // Cambiado de crear_rutas a create_routes        // Si no coincide con nada, busca en la carpeta static (index.html, login.html, etc.)
        .fallback_service(ServeDir::new("static"));

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));

    println!("Servidor en http://{}", addr);

    // 3. INICIO DEL SERVIDOR
    axum::serve(
        tokio::net::TcpListener::bind(addr).await.unwrap(),
        app.into_make_service(), // Se recomienda .into_make_service() para evitar errores de inferencia
    )
    .await
    .unwrap();
}