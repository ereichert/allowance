//! Configuration loading for the Allowance application.

/// Application configuration.
#[derive(Debug, Clone, serde::Deserialize)]
pub struct AppConfig {
    /// Address to bind the HTTP server to.
    pub listen_addr: String,
    /// PostgreSQL connection URL.
    pub database_url: String,
}

impl AppConfig {
    /// Loads configuration from environment variables, falling back to
    /// defaults for any variable that is not set.
    ///
    /// Reads: LISTEN_ADDR, DATABASE_URL
    pub fn from_env() -> Self {
        Self {
            listen_addr: std::env::var("LISTEN_ADDR")
                .unwrap_or_else(|_| "127.0.0.1:3000".to_string()),
            database_url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://localhost/allowance".to_string()),
        }
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        Self::from_env()
    }
}
