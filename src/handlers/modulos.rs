use axum::{extract::State, Json, http::StatusCode, Extension};
use sqlx::PgPool;
use crate::models::usuario::Claims;
use serde::{Serialize, Deserialize};

// 1. Estructuras de datos
#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Modulo {
    pub id: i32,
    pub str_nombre_modulo: String,
}

#[derive(Serialize)]
pub struct ModuloVisible {
    pub nombre: String,
    pub menu: i32,
    pub agregar: bool,
    pub editar: bool,
    pub eliminar: bool,
    pub consulta: bool,
    pub detalle: bool, // 👇 NUEVO: Agregamos detalle a la estructura
}

// 2. Función para listar todos los módulos (LA QUE PIDE ROUTES.RS)
pub async fn listar_modulos(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<Modulo>>, StatusCode> {
    let modulos = sqlx::query_as!(
        Modulo,
        r#"SELECT id as "id!", str_nombre_modulo as "str_nombre_modulo!" FROM modulo ORDER BY id"#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        println!("Error en BD listar_modulos: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(modulos))
}

// 3. Función para el Menú Dinámico basado en permisos (¡AHORA CON GOD MODE!) ⚡
pub async fn obtener_menu_permisos(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<Vec<ModuloVisible>>, StatusCode> {
    
    // PASO A: Averiguar si el perfil del usuario actual es Administrador
    let es_admin = sqlx::query_scalar!(
        r#"SELECT bit_administrador FROM perfil WHERE id = $1"#,
        claims.perfil
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        println!("Error al buscar si es admin: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .unwrap_or(false); // Si es nulo o no existe, asumimos que NO es admin por seguridad

    // PASO B: Decidir qué módulos enviarle
    let modulos = if es_admin {
        // 🦸‍♂️ MODO DIOS: Le damos acceso a TODO, forzando los permisos a 'true'
        sqlx::query_as!(
            ModuloVisible,
            r#"
            SELECT 
                str_nombre_modulo as "nombre!",
                0 as "menu!",
                true as "agregar!",
                true as "editar!",
                true as "eliminar!",
                true as "consulta!",
                true as "detalle!" -- 👇 NUEVO: MODO DIOS tiene detalle activado
            FROM modulo
            ORDER BY id
            "#
        )
        .fetch_all(&pool)
        .await
    } else {
        // 🧑‍💼 MODO NORMAL: Verificamos sus permisos uno por uno
        sqlx::query_as!(
            ModuloVisible,
            r#"
            SELECT 
                m.str_nombre_modulo as "nombre!",
                0 as "menu!",
                pp.bit_agregar as "agregar!",
                pp.bit_editar as "editar!",
                pp.bit_eliminar as "eliminar!",
                pp.bit_consulta as "consulta!",
                pp.bit_detalle as "detalle!" -- 👇 NUEVO: Leemos bit_detalle de la BD
            FROM modulo m
            JOIN permisos_perfil pp ON m.id = pp.id_modulo
            WHERE pp.id_perfil = $1 
              -- 👇 NUEVO: Agregamos bit_detalle a la condición para que traiga la info
              AND (pp.bit_agregar OR pp.bit_editar OR pp.bit_eliminar OR pp.bit_consulta OR pp.bit_detalle)
            ORDER BY m.id
            "#,
            claims.perfil
        )
        .fetch_all(&pool)
        .await
    };

    // Evaluamos si alguna de las dos consultas falló
    let modulos_finales = modulos.map_err(|e| {
        println!("Error en menu permisos: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(modulos_finales))
}