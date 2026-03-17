use axum::{extract::State, Json, http::StatusCode, Extension};
use sqlx::PgPool;
use crate::models::usuario::Claims;
use serde::{Serialize, Deserialize};

// 1. Estructuras de datos
#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Modulo {
    pub id: i32,
    pub str_nombre_modulo: String,
}

#[derive(Serialize)]
pub struct ModuloVisible {
    pub nombre: String,
    pub menu: i32,
    pub agregar: bool,
    pub editar: bool,
    pub eliminar: bool,
    pub consulta: bool,
}

// 2. Función para listar todos los módulos (LA QUE PIDE ROUTES.RS)
pub async fn listar_modulos(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<Modulo>>, StatusCode> {
    let modulos = sqlx::query_as!(
        Modulo,
        r#"SELECT id as "id!", str_nombre_modulo as "str_nombre_modulo!" FROM modulo ORDER BY id"#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        println!("Error en BD listar_modulos: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(modulos))
}

// 3. Función para el Menú Dinámico basado en permisos
pub async fn obtener_menu_permisos(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<Vec<ModuloVisible>>, StatusCode> {
    let modulos = sqlx::query_as!(
        ModuloVisible,
        r#"
        SELECT 
            m.str_nombre_modulo as "nombre!",
            mn.id_menu as "menu!",
            pp.bit_agregar as "agregar!",
            pp.bit_editar as "editar!",
            pp.bit_eliminar as "eliminar!",
            pp.bit_consulta as "consulta!"
        FROM modulo m
        JOIN permisos_perfil pp ON m.id = pp.id_modulo
        JOIN menu mn ON m.id = mn.id_modulo
        WHERE pp.id_perfil = $1 
          AND (pp.bit_agregar OR pp.bit_editar OR pp.bit_eliminar OR pp.bit_consulta)
        "#,
        claims.perfil
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        println!("Error en menu permisos: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(modulos))
}