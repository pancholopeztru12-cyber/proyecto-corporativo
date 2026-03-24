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
            u.id as "id!",
            u.str_nombre_usuario as "nombre!",
            u.str_correo as "email",
            u.str_numero_celular as "celular",
            u.imagen,
            u.id_estado_usuario,
            p.str_nombre_perfil as "perfil"
        FROM usuario u
        LEFT JOIN perfil p ON u.id_perfil = p.id
        ORDER BY u.id DESC
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
   EDITAR USUARIO (CON SOPORTE PARA IMAGEN Y PASSWORD)
   ========================================== */
pub async fn editar_usuario(
    Path(id): Path<i32>,
    State(pool): State<PgPool>,
    mut multipart: Multipart,
) -> Result<StatusCode, StatusCode> {
    
    let mut str_nombre_usuario: Option<String> = None;
    let mut str_pwd: Option<String> = None;
    let mut id_perfil: Option<i32> = None;
    let mut str_correo: Option<String> = None;
    let mut str_numero_celular: Option<String> = None;
    let mut id_estado_usuario: Option<bool> = None;
    let mut nombre_imagen_guardada: Option<String> = None;

    // Abrimos la "caja" FormData que manda Javascript
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
                "str_nombre_usuario" => str_nombre_usuario = Some(data),
                "str_pwd" => if !data.is_empty() { str_pwd = Some(data) }, // Solo si escribió algo
                "id_perfil" => id_perfil = Some(data.parse().unwrap_or(0)),
                "str_correo" => str_correo = if data.is_empty() { None } else { Some(data) },
                "str_numero_celular" => str_numero_celular = if data.is_empty() { None } else { Some(data) },
                "id_estado_usuario" => id_estado_usuario = Some(data.parse().unwrap_or(true)),
                _ => {}
            }
        }
    }

    // Si mandó password nuevo, lo encriptamos
    let pwd_hasheado = match str_pwd {
        Some(pwd) => Some(hash(&pwd, DEFAULT_COST).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?),
        None => None,
    };

    // Usamos COALESCE en SQL para NO borrar los datos viejos si el campo viene vacío (ej. si no sube foto nueva)
    sqlx::query!(
        r#"
        UPDATE usuario
        SET 
            str_nombre_usuario = COALESCE($1, str_nombre_usuario),
            id_perfil = COALESCE($2, id_perfil),
            str_correo = $3,
            str_numero_celular = $4,
            imagen = COALESCE($5, imagen),
            id_estado_usuario = COALESCE($6, id_estado_usuario),
            str_pwd = COALESCE($7, str_pwd)
        WHERE id = $8
        "#,
        str_nombre_usuario,
        id_perfil,
        str_correo,
        str_numero_celular,
        nombre_imagen_guardada,
        id_estado_usuario,
        pwd_hasheado,
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