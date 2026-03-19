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
        // PERFILES (Se agregó el /api/ y se encadenó el .post)
        .route("/api/perfiles", get(crate::handlers::perfiles::listar).post(crate::handlers::perfiles::crear_perfil))

        // USUARIOS (Se agregó el /api/ y se encadenaron correctamente para evitar que Axum crashee)
        .route("/api/usuarios", get(crate::handlers::usuarios::listar).post(crate::handlers::usuarios::crear_usuario))
        .route("/api/usuarios/:id", put(crate::handlers::usuarios::editar_usuario).delete(crate::handlers::usuarios::eliminar_usuario))

        // MODULOS Y MENU DINÁMICO
        .route("/api/modulos", get(crate::handlers::modulos::listar_modulos))
        .route("/api/menu-dinamico", get(crate::handlers::modulos::obtener_menu_permisos))

        // PERMISOS
        .route("/api/permisos_perfil", get(crate::handlers::permisos_perfil::listar_permisos).post(crate::handlers::permisos_perfil::crear_permiso))
        .route("/api/permisos_perfil/:id", put(crate::handlers::permisos_perfil::editar_permiso).delete(crate::handlers::permisos_perfil::eliminar_permiso))

        // Aplicamos el middleware de JWT solo a estas rutas
        .route_layer(middleware::from_fn(jwt_auth));

    // Rutas PÚBLICAS (Login y Home)
    Router::new()
        .route("/", get(home))
        // El login lo dejamos como estaba para no romper tu inicio de sesión actual
        .route("/login", post(login)) 
        .merge(protected)
        .with_state(pool)
}