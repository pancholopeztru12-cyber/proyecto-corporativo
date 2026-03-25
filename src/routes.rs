use axum::{
    Router,
    routing::{get, post, put, delete},
    middleware,
};
use sqlx::PgPool;

use crate::handlers::auth::login;
use crate::middleware::jwt::jwt_auth;

async fn home() -> &'static str {
    "API Proyecto Corporativo funcionando 🚀 VERSION 2"
}

pub fn create_routes(pool: PgPool) -> Router {
    // Rutas que REQUIEREN Token JWT
    let protected = Router::new()
        // PERFILES (Ahora con sus rutas de editar y eliminar)
        .route("/perfiles", get(crate::handlers::perfiles::listar).post(crate::handlers::perfiles::crear_perfil))
        .route("/perfiles/:id", put(crate::handlers::perfiles::editar_perfil).delete(crate::handlers::perfiles::eliminar_perfil))

        // USUARIOS
        .route("/usuarios", get(crate::handlers::usuarios::listar).post(crate::handlers::usuarios::crear_usuario))
        .route("/usuarios/:id", put(crate::handlers::usuarios::editar_usuario).delete(crate::handlers::usuarios::eliminar_usuario))

        // MODULOS Y MENU DINÁMICO
        .route("/modulos", get(crate::handlers::modulos::listar_modulos))
        .route("/menu-dinamico", get(crate::handlers::modulos::obtener_menu_permisos))

        // PERMISOS
        .route("/permisos_perfil", get(crate::handlers::permisos_perfil::listar_permisos).post(crate::handlers::permisos_perfil::crear_permiso))
        .route("/permisos_perfil/:id", put(crate::handlers::permisos_perfil::editar_permiso).delete(crate::handlers::permisos_perfil::eliminar_permiso))

        // Aplicamos el middleware de JWT solo a estas rutas
        .route_layer(middleware::from_fn(jwt_auth));

    // Rutas PÚBLICAS (Login y Home)
    Router::new()
        .route("/test-version", get(|| async { "¡LA NUBE YA TIENE EL CODIGO NUEVO!" }))
        .route("/", get(home))
        .route("/login", post(login)) 
        .merge(protected)
        .with_state(pool)
}