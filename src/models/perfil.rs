use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct Perfil {
    pub id: i32,
    pub str_nombre_perfil: String,
    // pub bit_administrador: bool, // Lo dejamos comentado si tu tabla original no lo pedía aquí
}

// Estructura NUEVA para atrapar los datos del HTML
#[derive(Deserialize, Debug)]
pub struct CrearPerfilReq {
    pub str_nombre_perfil: String,
    pub bit_administrador: bool,
    pub descripcion: Option<String>,
}