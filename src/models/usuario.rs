use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, sqlx::FromRow, Debug)]
pub struct Usuario {
    pub id: i32,
    pub nombre: String,        // Alias de str_nombre_usuario
    pub email: Option<String>, // Alias de str_correo
    pub celular: Option<String>, // Alias de str_numero_celular
    pub imagen: Option<String>,
    pub id_estado_usuario: Option<bool>,
    pub perfil: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)] // Asegúrate de que tenga Clone
pub struct Claims {
    pub sub: i32,
    pub perfil: i32,
    pub exp: usize,
}