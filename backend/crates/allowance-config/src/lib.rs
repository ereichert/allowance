//! Configuration loading for the Allowance application.

/// Application configuration.
#[derive(Debug, Clone, serde::Deserialize)]
pub struct AppConfig {
    /// Address to bind the HTTP server to.
    pub listen_addr: String,
    /// PostgreSQL connection URL.
    pub database_url: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            listen_addr: "127.0.0.1:3000".to_string(),
            database_url: "postgres://localhost/allowance".to_string(),
        }
    }
}
