use allowance_api::build_router;
use allowance_config::AppConfig;
use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let config = AppConfig::from_env();
    tracing::info!(listen_addr = %config.listen_addr, "Allowance API starting");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&config.database_url)
        .await
        .unwrap_or_else(|e| panic!("failed to connect to database: {e}"));

    let app = build_router(pool, &config.cors_origin);

    let listener = tokio::net::TcpListener::bind(&config.listen_addr)
        .await
        .unwrap_or_else(|e| panic!("failed to bind {}: {e}", config.listen_addr));

    tracing::info!("listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.expect("server error");
}
