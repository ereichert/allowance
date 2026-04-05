//! Configuration loading for the Allowance application.

#[derive(Debug, Clone, serde::Deserialize)]
pub struct AppConfig {
    /// Address to bind the HTTP server to.
    pub listen_addr: String,
    /// PostgreSQL connection URL.
    pub database_url: String,
    /// Allowed CORS origin for the frontend (e.g. http://localhost:5173).
    pub cors_origin: String,
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
            cors_origin: std::env::var("CORS_ORIGIN")
                .unwrap_or_else(|_| "http://localhost:5173".to_string()),
        }
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        Self::from_env()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cors_origin_defaults_to_localhost_5173() {
        if std::env::var("CORS_ORIGIN").is_ok() {
            return;
        }
        let config = AppConfig::from_env();
        assert_eq!(config.cors_origin, "http://localhost:5173");
    }
}
