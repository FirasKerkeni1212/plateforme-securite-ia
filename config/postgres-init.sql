-- Initialisation base de données PostgreSQL
CREATE TABLE IF NOT EXISTS security_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(50),
    log_text TEXT,
    is_anomaly BOOLEAN,
    criticality VARCHAR(20),
    actions TEXT[]
);

CREATE TABLE IF NOT EXISTS analysis_history (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    log_hash VARCHAR(64),
    analysis_result JSON
);

CREATE INDEX idx_security_logs_timestamp ON security_logs(timestamp);
CREATE INDEX idx_security_logs_anomaly ON security_logs(is_anomaly);
