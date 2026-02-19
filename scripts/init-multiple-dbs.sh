#!/bin/bash
# PostgreSQL Multi-Database Initialization Script
# Creates separate databases and users for each service

set -e
set -u

function create_user_and_database() {
    local database=$1
    local password_var="POSTGRES_${database^^}_PASSWORD"
    local password="${!password_var:-}"

    if [ -z "$password" ]; then
        echo "ERROR: No password set for $database (expected env var $password_var)"
        echo "Set $password_var in your .env file"
        return 1
    fi
    
    echo "Creating user and database: $database"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
        CREATE USER $database WITH PASSWORD '$password';
        CREATE DATABASE $database;
        GRANT ALL PRIVILEGES ON DATABASE $database TO $database;
        ALTER DATABASE $database OWNER TO $database;
EOSQL
    
    # Grant schema permissions
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$database" <<-EOSQL
        GRANT ALL ON SCHEMA public TO $database;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $database;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $database;
EOSQL
}

if [ -n "${POSTGRES_MULTIPLE_DATABASES:-}" ]; then
    echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
    for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        create_user_and_database $db
    done
    echo "Multiple databases created"
fi

# Create audit schema for logging (optional enhancement)
echo "Creating audit infrastructure..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
    CREATE DATABASE op1_audit;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "op1_audit" <<-EOSQL
    CREATE TABLE IF NOT EXISTS ai_interactions (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        user_id VARCHAR(255),
        session_id VARCHAR(255),
        request_type VARCHAR(50),
        tool_used VARCHAR(100),
        tokens_used INTEGER,
        response_time_ms INTEGER,
        status VARCHAR(20),
        metadata JSONB
    );
    
    CREATE INDEX idx_ai_interactions_timestamp ON ai_interactions(timestamp);
    CREATE INDEX idx_ai_interactions_user ON ai_interactions(user_id);
    CREATE INDEX idx_ai_interactions_tool ON ai_interactions(tool_used);
    
    CREATE TABLE IF NOT EXISTS mcp_tool_calls (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        session_id VARCHAR(255),
        tool_name VARCHAR(100),
        parameters JSONB,
        result_status VARCHAR(20),
        execution_time_ms INTEGER,
        approval_required BOOLEAN DEFAULT FALSE,
        approved_by VARCHAR(255),
        approved_at TIMESTAMPTZ
    );
    
    CREATE INDEX idx_mcp_calls_timestamp ON mcp_tool_calls(timestamp);
    CREATE INDEX idx_mcp_calls_tool ON mcp_tool_calls(tool_name);
EOSQL

echo "Database initialization complete"
