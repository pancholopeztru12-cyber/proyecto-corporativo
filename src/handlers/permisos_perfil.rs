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
    pub nombre_perfil: Option<String>,
    pub nombre_modulo: Option<String>,
}

// 👇 CAMBIO CLAVE: id_modulo pasa a ser id_modulos (un Vec<i32> o arreglo)
#[derive(Deserialize)]
pub struct DatosPermiso {
    pub id_modulos: Vec<i32>, 
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
        INNER JOIN perfil p ON pp.id_perfil = p.id
        INNER JOIN modulo m ON pp.id_modulo = m.id
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
   CREAR PERMISO (¡AHORA SOPORTA MÚLTIPLES!)
   ========================================== */
pub async fn crear_permiso(
    State(pool): State<PgPool>,
    Json(data): Json<DatosPermiso>,
) -> Result<StatusCode, StatusCode> {
    
    // 👇 Iteramos sobre la lista de módulos que nos manda el frontend
    for modulo_id in &data.id_modulos {
        sqlx::query!(
            r#"
            INSERT INTO permisos_perfil 
            (id_modulo, id_perfil, bit_agregar, bit_editar, bit_consulta, bit_eliminar, bit_detalle)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
            modulo_id, // Usamos el ID individual de este ciclo
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
            println!("Error insertando permiso para el modulo {}: {:?}", modulo_id, e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    }

    Ok(StatusCode::CREATED)
}

/* ==========================================
   EDITAR PERMISO (CORREGIDO PARA MÚLTIPLES)
   ========================================== */
pub async fn editar_permiso(
    Path(id): Path<i32>,
    State(pool): State<PgPool>,
    Json(data): Json<DatosPermiso>,
) -> Result<StatusCode, StatusCode> {
    
    // 1. Borramos el permiso individual que se estaba editando
    sqlx::query!("DELETE FROM permisos_perfil WHERE id = $1", id)
        .execute(&pool)
        .await
        .map_err(|e| {
            println!("Error eliminando permiso viejo al editar: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    // 2. Insertamos TODOS los módulos que el usuario haya dejado marcados
    for modulo_id in &data.id_modulos {
        sqlx::query!(
            r#"
            INSERT INTO permisos_perfil 
            (id_modulo, id_perfil, bit_agregar, bit_editar, bit_consulta, bit_eliminar, bit_detalle)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
            modulo_id,
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
            println!("Error insertando permisos actualizados: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    }

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