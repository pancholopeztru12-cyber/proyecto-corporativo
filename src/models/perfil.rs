use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct Perfil {
    pub id: i32,
    pub str_nombre_perfil: String,
    // pub bit_administrador: bool, // Descomenta esta línea si tu tabla ya tiene esta columna
}