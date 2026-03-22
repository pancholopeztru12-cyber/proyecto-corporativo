use axum::{extract::State, Json, http::StatusCode};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use jsonwebtoken::{encode, Header, EncodingKey};
use bcrypt::verify;
use std::env;
use crate::models::usuario::Claims;

#[derive(Deserialize)]
pub struct LoginRequest {
    pub usuario: String,
    pub password: String,
    pub captcha: String, 
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub nombre: String, // <--- NUEVO: Agregamos el nombre a la respuesta
}

#[derive(Deserialize)]
struct CaptchaResponse {
    success: bool,
}

pub async fn login(
    State(pool): State<PgPool>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, (StatusCode, Json<serde_json::Value>)> {
    
    // ==========================================
    // 1. VALIDAR CAPTCHA CON GOOGLE
    // ==========================================
    let secret_key = "6LcigIssAAAAAJ_1YcrpeHUTCQdjFM07tEZEsuBM"; 
    
    let client = reqwest::Client::new();
    let res = client.post("https://www.google.com/recaptcha/api/siteverify")
        .form(&[
            ("secret", secret_key),
            ("response", &payload.captcha),
        ])
        .send()
        .await
        .map_err(|_| {
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": "Error contactando a Google"})))
        })?;

    let captcha_result: CaptchaResponse = res.json().await.map_err(|_| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": "Error leyendo respuesta de Google"})))
    })?;

    if !captcha_result.success {
        return Err((
            StatusCode::UNAUTHORIZED, 
            Json(serde_json::json!({"message": "Validación de Captcha fallida"}))
        ));
    }

    // ==========================================
    // 2. BUSCAR USUARIO
    // ==========================================
    // NUEVO: Agregué `str_nombre_usuario` a la consulta
    let user = sqlx::query!(
        r#"SELECT id, str_nombre_usuario, str_pwd, id_perfil, id_estado_usuario FROM usuario WHERE str_nombre_usuario = $1"#,
        payload.usuario
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| (
        StatusCode::INTERNAL_SERVER_ERROR, 
        Json(serde_json::json!({"message": "Error de BD"}))
    ))?;

    let u = match user {
        Some(u) => u,
        None => return Err((
            StatusCode::UNAUTHORIZED, 
            Json(serde_json::json!({"message": "Usuario no existe"}))
        )),
    };

    // ==========================================
    // 3. VALIDAR ESTADO Y PASSWORD
    // ==========================================
    if !u.id_estado_usuario { 
        return Err((
            StatusCode::UNAUTHORIZED, 
            Json(serde_json::json!({"message": "El estado del usuario es inactivo"}))
        ));
    }

    if !verify(&payload.password, &u.str_pwd).unwrap_or(false) {
        return Err((
            StatusCode::UNAUTHORIZED, 
            Json(serde_json::json!({"message": "Contraseña incorrecta"}))
        ));
    }

    // ==========================================
    // 4. GENERAR JWT
    // ==========================================
    let claims = Claims {
        sub: u.id,
        perfil: u.id_perfil,
        exp: 2000000000, 
    };

    let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "secret123".into());
    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_ref()))
        .map_err(|_| (
            StatusCode::INTERNAL_SERVER_ERROR, 
            Json(serde_json::json!({"message": "Error al generar token"}))
        ))?;

    // NUEVO: Devolvemos también el nombre del usuario
    Ok(Json(LoginResponse { 
        token,
        nombre: u.str_nombre_usuario, 
    }))
}