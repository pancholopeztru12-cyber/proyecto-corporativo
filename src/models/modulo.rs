use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct Modulo {
    pub id: i32,
    pub str_nombre_modulo: String,
    pub str_ruta: String,
    pub str_icono: Option<String>,
}