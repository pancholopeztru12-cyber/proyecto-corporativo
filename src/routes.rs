use axum::{
    Router,
    routing::{get, post, put, delete},
    middleware,
};
use sqlx::PgPool;

use crate::handlers::auth::login;
use crate::middleware::jwt::jwt_auth;

async fn home() -> &'static str {
    "API Proyecto Corporativo funcionando 🚀"
}

pub fn create_routes(pool: PgPool) -> Router {
    // Rutas que REQUIEREN Token JWT
    let protected = Router::new()
        .route("/perfiles", get(crate::handlers::perfiles::listar))

        // USUARIOS
        .route("/usuarios", get(crate::handlers::usuarios::listar))
        .route("/usuarios", post(crate::handlers::usuarios::crear_usuario))
        .route("/usuarios/:id", put(crate::handlers::usuarios::editar_usuario))
        .route("/usuarios/:id", delete(crate::handlers::usuarios::eliminar_usuario))

        // MODULOS Y MENU DINÁMICO (Requisito de Evaluación)
        .route("/modulos", get(crate::handlers::modulos::listar_modulos))
        .route("/menu-dinamico", get(crate::handlers::modulos::obtener_menu_permisos))

        // PERMISOS (Para la gestión de bits)
        // Agregamos POST, PUT y DELETE. Usamos guion_bajo para coincidir con el frontend
        .route("/permisos_perfil", get(crate::handlers::permisos_perfil::listar_permisos).post(crate::handlers::permisos_perfil::crear_permiso))
        .route("/permisos_perfil/:id", put(crate::handlers::permisos_perfil::editar_permiso).delete(crate::handlers::permisos_perfil::eliminar_permiso))

        // Aplicamos el middleware de JWT solo a estas rutas
        .route_layer(middleware::from_fn(jwt_auth));

    // Rutas PÚBLICAS (Login y Home)
    Router::new()
        .route("/", get(home))
        .route("/login", post(login))
        .merge(protected)
        .with_state(pool) // El estado se pasa una sola vez al final del merge
}