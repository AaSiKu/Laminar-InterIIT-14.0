# PostgreSQL Data Server

FastAPI server for fetching paginated data from PostgreSQL database.

## Setup

### 1. Install PostgreSQL

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database and Sample Table

```bash
# Access PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE pathway_db;

# Connect to database
\c pathway_db

# Create sample table
CREATE TABLE node_data (
    id SERIAL PRIMARY KEY,
    node_id VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    value NUMERIC(10, 2),
    status VARCHAR(50),
    message TEXT,
    metadata JSONB
);

# Insert sample data
INSERT INTO node_data (node_id, value, status, message, metadata) VALUES
('node-001', 123.45, 'active', 'Sample data row 1', '{"type": "sensor", "location": "building-A"}'),
('node-001', 234.56, 'active', 'Sample data row 2', '{"type": "sensor", "location": "building-A"}'),
('node-001', 345.67, 'warning', 'Sample data row 3', '{"type": "sensor", "location": "building-B"}'),
('node-001', 456.78, 'active', 'Sample data row 4', '{"type": "sensor", "location": "building-B"}'),
('node-001', 567.89, 'error', 'Sample data row 5', '{"type": "sensor", "location": "building-C"}'),
('node-001', 678.90, 'active', 'Sample data row 6', '{"type": "sensor", "location": "building-C"}'),
('node-001', 789.01, 'active', 'Sample data row 7', '{"type": "sensor", "location": "building-D"}'),
('node-001', 890.12, 'warning', 'Sample data row 8', '{"type": "sensor", "location": "building-D"}'),
('node-001', 901.23, 'active', 'Sample data row 9', '{"type": "sensor", "location": "building-E"}'),
('node-001', 112.34, 'active', 'Sample data row 10', '{"type": "sensor", "location": "building-E"}'),
('node-001', 223.45, 'error', 'Sample data row 11', '{"type": "sensor", "location": "building-F"}'),
('node-001', 334.56, 'active', 'Sample data row 12', '{"type": "sensor", "location": "building-F"}'),
('node-001', 445.67, 'active', 'Sample data row 13', '{"type": "sensor", "location": "building-G"}'),
('node-001', 556.78, 'warning', 'Sample data row 14', '{"type": "sensor", "location": "building-G"}'),
('node-001', 667.89, 'active', 'Sample data row 15', '{"type": "sensor", "location": "building-H"}');

# Verify data
SELECT COUNT(*) FROM node_data;

# Exit psql
\q
```

### 3. Install Python Dependencies

```bash
cd backend/postgresServer
pip install -r requirements.txt
```

### 4. Configure Environment

Copy `.env.example` to `.env` and update with your PostgreSQL credentials:

```bash
cp .env.example .env
```

Edit `.env` file with your database credentials.

### 5. Run the Server

```bash
python main.py
```

Or with uvicorn:

```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## API Endpoints

### Get Node Data (Paginated)

```
GET /api/node-data/{node_id}?start_row=0&limit=5
```

**Parameters:**
- `node_id`: Node identifier
- `start_row`: Starting row index (default: 0)
- `limit`: Number of rows to fetch (default: 5, max: 100)
- `table_name`: Table name (default: "node_data")

**Response:**
```json
{
  "node_id": "node-001",
  "data": [
    {
      "id": 1,
      "node_id": "node-001",
      "timestamp": "2024-01-01T10:00:00",
      "value": 123.45,
      "status": "active",
      "message": "Sample data row 1",
      "metadata": {"type": "sensor", "location": "building-A"}
    }
  ],
  "total_rows": 15,
  "start_row": 0,
  "limit": 5,
  "has_more": true,
  "timestamp": "2024-01-01T10:00:00"
}
```

### List Tables

```
GET /api/tables
```

### Get Table Info

```
GET /api/table-info/{table_name}
```

## Testing

```bash
# Health check
curl http://localhost:8001/

# Fetch first 5 rows
curl http://localhost:8001/api/node-data/node-001?start_row=0&limit=5

# Fetch next 5 rows
curl http://localhost:8001/api/node-data/node-001?start_row=5&limit=5

# List all tables
curl http://localhost:8001/api/tables

# Get table structure
curl http://localhost:8001/api/table-info/node_data
```

## Docker Setup (Optional)

```bash
# Build image
docker build -t postgres-server .

# Run container
docker run -p 8001:8001 --env-file .env postgres-server
```


