use axum::{
    extract::{State, Path, Query, Multipart},
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use serde::Deserialize;
use bcrypt::{hash, DEFAULT_COST};
use uuid::Uuid;

use crate::models::usuario::Usuario;

#[derive(Deserialize)]
pub struct ParamsPaginacion {
    pub pagina: Option<i64>,
}

/* ==========================================
   LISTAR USUARIOS
   ========================================== */
pub async fn listar(
    State(pool): State<PgPool>,
    Query(params): Query<ParamsPaginacion>,
) -> Result<Json<Vec<Usuario>>, StatusCode> {
    let limite = 5i64; 
    let offset = (params.pagina.unwrap_or(1) - 1) * limite;

    let usuarios = sqlx::query_as!(
        Usuario,
        r#"
        SELECT 
            id as "id!",
            str_nombre_usuario as "nombre!",
            str_correo as "email",
            str_numero_celular as "celular",
            imagen,
            id_estado_usuario  -- <-- NUEVO: Traemos el estado para pintarlo de colores
        FROM usuario
        ORDER BY id DESC
        LIMIT $1 OFFSET $2
        "#,
        limite,
        offset
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        println!("Error en SELECT listar: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(usuarios))
}

/* ==========================================
   CREAR USUARIO (CON SUBIDA DE IMAGEN FÍSICA Y ESTADO)
   ========================================== */
pub async fn crear_usuario(
    State(pool): State<PgPool>,
    mut multipart: Multipart,
) -> Result<StatusCode, StatusCode> {
    
    let mut str_nombre_usuario = String::new();
    let mut str_pwd = String::new();
    let mut id_perfil: i32 = 0;
    let mut str_correo: Option<String> = None;
    let mut str_numero_celular: Option<String> = None;
    let mut nombre_imagen_guardada: Option<String> = None;
    
    // NUEVO: Variable para capturar el estado desde el HTML
    let mut id_estado_usuario: bool = true; 

    while let Some(field) = multipart.next_field().await.unwrap() {
        let name = field.name().unwrap().to_string();

        if name == "imagen_archivo" {
            let file_name = field.file_name().unwrap_or("").to_string();
            
            if !file_name.is_empty() {
                let file_ext = file_name.split('.').last().unwrap_or("jpg").to_string();
                let bytes = field.bytes().await.unwrap();
                let unique_name = format!("{}.{}", Uuid::new_v4(), file_ext);
                let save_path = format!("uploads/usuarios/{}", unique_name);
                
                std::fs::write(&save_path, bytes).unwrap();
                nombre_imagen_guardada = Some(unique_name);
            }
        } else {
            let data = field.text().await.unwrap();
            match name.as_str() {
                "str_nombre_usuario" => str_nombre_usuario = data,
                "str_pwd" => str_pwd = data,
                "id_perfil" => id_perfil = data.parse().unwrap_or(0),
                "str_correo" => str_correo = if data.is_empty() { None } else { Some(data) },
                "str_numero_celular" => str_numero_celular = if data.is_empty() { None } else { Some(data) },
                // NUEVO: Capturamos el estado que manda el selector
                "id_estado_usuario" => id_estado_usuario = data.parse().unwrap_or(true),
                _ => {}
            }
        }
    }

    if str_nombre_usuario.is_empty() || id_perfil == 0 {
        return Err(StatusCode::BAD_REQUEST);
    }

    let hashed = hash(&str_pwd, DEFAULT_COST).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    sqlx::query!(
        r#"
        INSERT INTO usuario
        (str_nombre_usuario, id_perfil, str_pwd, str_correo, str_numero_celular, imagen, id_estado_usuario)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
        str_nombre_usuario,
        id_perfil,
        hashed,
        str_correo,
        str_numero_celular,
        nombre_imagen_guardada,
        id_estado_usuario // <-- NUEVO: Guardamos el estado dinámico
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        println!("Error insertando usuario: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(StatusCode::CREATED)
}

/* ==========================================
   EDITAR USUARIO
   ========================================== */
#[derive(Deserialize)]
pub struct EditarUsuario {
    pub str_nombre_usuario: String,
    pub id_perfil: i32,
    pub str_correo: Option<String>,
    pub str_numero_celular: Option<String>,
    pub imagen: Option<String>,
}

pub async fn editar_usuario(
    Path(id): Path<i32>,
    State(pool): State<PgPool>,
    Json(data): Json<EditarUsuario>,
) -> Result<StatusCode, StatusCode> {
    sqlx::query!(
        r#"
        UPDATE usuario
        SET 
            str_nombre_usuario = $1,
            id_perfil = $2,
            str_correo = $3,
            str_numero_celular = $4,
            imagen = $5
        WHERE id = $6
        "#,
        data.str_nombre_usuario,
        data.id_perfil,
        data.str_correo,
        data.str_numero_celular,
        data.imagen,
        id
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        println!("Error actualizando usuario: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(StatusCode::OK)
}

/* ==========================================
   ELIMINAR USUARIO (ELIMINACIÓN LÓGICA)
   ========================================== */
pub async fn eliminar_usuario(
    Path(id): Path<i32>,
    State(pool): State<PgPool>,
) -> Result<StatusCode, StatusCode> {
    sqlx::query!(
        // NUEVO: En lugar de borrar, lo pasamos a inactivo (false)
        r#"UPDATE usuario SET id_estado_usuario = false WHERE id = $1"#,
        id
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        println!("Error desactivando usuario: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(StatusCode::OK)
}