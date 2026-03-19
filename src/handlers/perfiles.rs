use axum::{extract::{State, Query}, Json, http::StatusCode};
use serde::Deserialize;
use sqlx::PgPool;

// Importamos el modelo y la nueva estructura
use crate::models::perfil::{Perfil, CrearPerfilReq}; 

#[derive(Deserialize)]
pub struct ParamsPaginacion {
    pub pagina: Option<i64>,
}

pub async fn listar(
    State(pool): State<PgPool>,
    Query(params): Query<ParamsPaginacion>,
) -> Result<Json<Vec<Perfil>>, StatusCode> {
    let limite = 100; 
    let offset = (params.pagina.unwrap_or(1) - 1) * limite;

    let perfiles = sqlx::query_as!(
        Perfil,
        r#"
        SELECT 
            id as "id!", 
            str_nombre_perfil as "str_nombre_perfil!" 
        FROM perfil 
        ORDER BY id ASC
        LIMIT $1 OFFSET $2
        "#,
        limite,
        offset
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        println!("Error en BD perfiles: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(perfiles))
}

// Función NUEVA para guardar en base de datos
pub async fn crear_perfil(
    State(pool): State<PgPool>,
    Json(payload): Json<CrearPerfilReq>,
) -> Result<StatusCode, StatusCode> {
    
    // Usamos query() normal para evitar problemas al subir a Render
    let res = sqlx::query(
        "INSERT INTO perfil (str_nombre_perfil, bit_administrador) VALUES ($1, $2)"
    )
    .bind(payload.str_nombre_perfil)
    .bind(payload.bit_administrador)
    .execute(&pool)
    .await;

    match res {
        Ok(_) => Ok(StatusCode::CREATED),
        Err(e) => {
            println!("Error al crear perfil: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}