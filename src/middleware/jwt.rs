use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use std::env;
// Importamos Claims desde tu modelo de usuario
use crate::models::usuario::Claims; 

pub async fn jwt_auth(
    mut req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // 1. Extraer el header de Authorization
    let auth_header = req.headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok());

    // 2. Verificar que el formato sea "Bearer <TOKEN>"
    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => {
            header.trim_start_matches("Bearer ").to_string()
        },
        _ => {
            println!("MiddleWare: No se encontró header Bearer o está vacío");
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    // 3. Obtener el secreto (IMPORTANTE: Igual al de auth.rs)
    let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "secret123".into());

    // 4. Decodificar y validar el token
    match decode::<Claims>(
        &token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::default(),
    ) {
        Ok(token_data) => {
            // Token válido: Insertamos los claims en las extensiones para usarlos después
            req.extensions_mut().insert(token_data.claims);
            Ok(next.run(req).await)
        },
        Err(e) => {
            // Aquí verás en la consola de Rust por qué falló exactamente
            println!("MiddleWare Error: Token inválido o secreto incorrecto: {:?}", e);
            Err(StatusCode::UNAUTHORIZED)
        }
    }
}