use sqlx::PgPool;
use std::env;

pub async fn connect_db() -> PgPool {
    let database_url =
        env::var("DATABASE_URL").expect("DATABASE_URL no definida");

    PgPool::connect(&database_url)
        .await
        .expect("No se pudo conectar a la base de datos")
}