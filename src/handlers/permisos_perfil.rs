use axum::{extract::{State, Path}, Json, http::StatusCode};
use serde::{Serialize, Deserialize};
use sqlx::PgPool;

/* ==========================================
   ESTRUCTURAS
   ========================================== */
#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct PermisoPerfil {
    pub id: i32,
    pub id_modulo: i32,
    pub id_perfil: i32,
    pub bit_agregar: bool,
    pub bit_editar: bool,
    pub bit_consulta: bool,
    pub bit_eliminar: bool,
    pub bit_detalle: bool,
    // 👇 AGREGAMOS ESTOS DOS CAMPOS (El frontend ya los está esperando)
    pub nombre_perfil: Option<String>,
    pub nombre_modulo: Option<String>,
}

#[derive(Deserialize)]
pub struct DatosPermiso {
    pub id_modulo: i32,
    pub id_perfil: i32,
    pub bit_agregar: bool,
    pub bit_editar: bool,
    pub bit_consulta: bool,
    pub bit_eliminar: bool,
    pub bit_detalle: bool,
}

/* ==========================================
   LISTAR PERMISOS
   ========================================== */
pub async fn listar_permisos(
    State(pool): State<PgPool>
) -> Result<Json<Vec<PermisoPerfil>>, StatusCode> {
    // 👇 Usamos query_as::<_, PermisoPerfil> SIN el signo de exclamación
    let permisos = sqlx::query_as::<_, PermisoPerfil>(
        r#"
        SELECT 
            pp.id, 
            pp.id_modulo, 
            pp.id_perfil, 
            pp.bit_agregar, 
            pp.bit_editar, 
            pp.bit_consulta, 
            pp.bit_eliminar, 
            pp.bit_detalle,
            p.str_nombre_perfil as nombre_perfil,
            m.str_nombre_modulo as nombre_modulo
        FROM permisos_perfil pp
        INNER JOIN perfiles p ON pp.id_perfil = p.id
        INNER JOIN modulos m ON pp.id_modulo = m.id
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        println!("Error en BD permisos_perfil: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(permisos))
}

/* ==========================================
   CREAR PERMISO
   ========================================== */
pub async fn crear_permiso(
    State(pool): State<PgPool>,
    Json(data): Json<DatosPermiso>,
) -> Result<StatusCode, StatusCode> {
    sqlx::query!(
        r#"
        INSERT INTO permisos_perfil 
        (id_modulo, id_perfil, bit_agregar, bit_editar, bit_consulta, bit_eliminar, bit_detalle)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
        data.id_modulo,
        data.id_perfil,
        data.bit_agregar,
        data.bit_editar,
        data.bit_consulta,
        data.bit_eliminar,
        data.bit_detalle
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        println!("Error insertando permiso: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(StatusCode::CREATED)
}

/* ==========================================
   EDITAR PERMISO
   ========================================== */
pub async fn editar_permiso(
    Path(id): Path<i32>,
    State(pool): State<PgPool>,
    Json(data): Json<DatosPermiso>,
) -> Result<StatusCode, StatusCode> {
    sqlx::query!(
        r#"
        UPDATE permisos_perfil 
        SET id_modulo = $1, id_perfil = $2, bit_agregar = $3, 
            bit_editar = $4, bit_consulta = $5, bit_eliminar = $6, bit_detalle = $7
        WHERE id = $8
        "#,
        data.id_modulo,
        data.id_perfil,
        data.bit_agregar,
        data.bit_editar,
        data.bit_consulta,
        data.bit_eliminar,
        data.bit_detalle,
        id
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        println!("Error actualizando permiso: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(StatusCode::OK)
}

/* ==========================================
   ELIMINAR PERMISO
   ========================================== */
pub async fn eliminar_permiso(
    Path(id): Path<i32>,
    State(pool): State<PgPool>,
) -> Result<StatusCode, StatusCode> {
    sqlx::query!(
        r#"DELETE FROM permisos_perfil WHERE id = $1"#,
        id
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        println!("Error eliminando permiso: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(StatusCode::OK)
}