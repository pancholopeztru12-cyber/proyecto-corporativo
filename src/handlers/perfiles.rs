use axum::{extract::{State, Query}, Json, http::StatusCode};
use serde::Deserialize;
use sqlx::PgPool;

// Importamos el modelo desde tu carpeta models
use crate::models::perfil::Perfil; 

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

    // Aquí está la magia: quitamos "bit_administrador" del SELECT
    // Ahora coincide al 100% con tu struct de src/models/perfil.rs
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