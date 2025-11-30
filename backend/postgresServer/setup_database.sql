-- PostgreSQL Database Setup Script
-- Run this script to set up the database and sample data

-- Create database (run this separately if needed)
-- CREATE DATABASE pathway_db;

-- Connect to the database
-- \c pathway_db;

-- Create the node_data table
CREATE TABLE IF NOT EXISTS node_data (
    id SERIAL PRIMARY KEY,
    node_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    value NUMERIC(10, 2),
    status VARCHAR(50),
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on node_id for faster queries
CREATE INDEX IF NOT EXISTS idx_node_data_node_id ON node_data(node_id);
CREATE INDEX IF NOT EXISTS idx_node_data_timestamp ON node_data(timestamp);

-- Insert sample data (15 rows for testing pagination)
INSERT INTO node_data (node_id, value, status, message, metadata) VALUES
('node-001', 123.45, 'active', 'Sample data row 1', '{"type": "sensor", "location": "building-A", "temperature": 22.5}'),
('node-001', 234.56, 'active', 'Sample data row 2', '{"type": "sensor", "location": "building-A", "temperature": 23.1}'),
('node-001', 345.67, 'warning', 'Sample data row 3 - High temperature', '{"type": "sensor", "location": "building-B", "temperature": 28.3}'),
('node-001', 456.78, 'active', 'Sample data row 4', '{"type": "sensor", "location": "building-B", "temperature": 21.8}'),
('node-001', 567.89, 'error', 'Sample data row 5 - Sensor malfunction', '{"type": "sensor", "location": "building-C", "temperature": null}'),
('node-001', 678.90, 'active', 'Sample data row 6', '{"type": "sensor", "location": "building-C", "temperature": 22.0}'),
('node-001', 789.01, 'active', 'Sample data row 7', '{"type": "sensor", "location": "building-D", "temperature": 24.5}'),
('node-001', 890.12, 'warning', 'Sample data row 8 - Elevated readings', '{"type": "sensor", "location": "building-D", "temperature": 27.2}'),
('node-001', 901.23, 'active', 'Sample data row 9', '{"type": "sensor", "location": "building-E", "temperature": 23.8}'),
('node-001', 112.34, 'active', 'Sample data row 10', '{"type": "sensor", "location": "building-E", "temperature": 22.3}'),
('node-001', 223.45, 'error', 'Sample data row 11 - Connection lost', '{"type": "sensor", "location": "building-F", "temperature": null}'),
('node-001', 334.56, 'active', 'Sample data row 12', '{"type": "sensor", "location": "building-F", "temperature": 21.5}'),
('node-001', 445.67, 'active', 'Sample data row 13', '{"type": "sensor", "location": "building-G", "temperature": 24.0}'),
('node-001', 556.78, 'warning', 'Sample data row 14 - Check calibration', '{"type": "sensor", "location": "building-G", "temperature": 26.8}'),
('node-001', 667.89, 'active', 'Sample data row 15', '{"type": "sensor", "location": "building-H", "temperature": 22.9}');

-- Verify the data
SELECT COUNT(*) as total_rows FROM node_data;
SELECT * FROM node_data LIMIT 5;

-- Create a function to update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_node_data_updated_at BEFORE UPDATE
    ON node_data FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust username as needed)
-- GRANT ALL PRIVILEGES ON DATABASE pathway_db TO postgres;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Show table structure
\d node_data;


