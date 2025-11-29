# PostgreSQL Data Server Setup Guide

Complete guide for setting up the PostgreSQL FastAPI server and integrating it with the frontend.

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Backend Setup](#backend-setup)
4. [Database Setup](#database-setup)
5. [Frontend Integration](#frontend-integration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

## Overview

This system allows you to:
- Fetch paginated data from PostgreSQL when hovering over workflow nodes
- Display data in a table with auto-refresh every 10 seconds
- Navigate through pages (5 rows per page)
- See real-time update status

### Architecture
```
Frontend (React)
    ↓ (hover on node)
    → NodeDataTable Component
    → Fetches from API
    ↓
Backend (FastAPI)
    → Port 8001
    → Connects to PostgreSQL
    ↓
PostgreSQL Database
    → Port 5432
    → Table: node_data
```

## Prerequisites

### 1. Install PostgreSQL

**macOS:**
```bash
# Install via Homebrew
brew install postgresql@15
brew services start postgresql@15

# Or using postgresql (latest)
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
Download and install from: https://www.postgresql.org/download/windows/

### 2. Verify PostgreSQL Installation

```bash
# Check version
psql --version

# Access PostgreSQL
psql -U postgres

# If password required (default is often 'postgres')
# You can set it:
sudo -u postgres psql
\password postgres
```

### 3. Python Requirements

```bash
python3 --version  # Should be 3.8+
pip3 --version
```

## Backend Setup

### Step 1: Navigate to PostgreSQL Server Directory

```bash
cd backend/postgresServer
```

### Step 2: Create Environment File

Create a `.env` file (or copy from config_example.txt):

```bash
# Create .env file
cat > .env << EOF
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=pathway_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
SERVER_PORT=8001
EOF
```

**Important:** Update the credentials to match your PostgreSQL setup!

### Step 3: Install Python Dependencies

```bash
# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

## Database Setup

### Option 1: Quick Setup (Automated)

```bash
# Run the quickstart script
./quickstart.sh
```

This script will:
- Check dependencies
- Create .env file
- Install Python packages
- Set up the database
- Start the server

### Option 2: Manual Setup

#### Step 1: Create Database

```bash
# Access PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE pathway_db;

# Exit
\q
```

#### Step 2: Run Setup Script

```bash
# Run the SQL setup script
psql -U postgres -d pathway_db -f setup_database.sql
```

Or manually in psql:
```sql
\c pathway_db
\i setup_database.sql
```

#### Step 3: Verify Data

```sql
-- Check table exists
\dt

-- Count rows
SELECT COUNT(*) FROM node_data;
-- Should return: 15

-- View first 5 rows
SELECT * FROM node_data LIMIT 5;
```

### Database Schema

```sql
CREATE TABLE node_data (
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
```

## Running the Server

### Start the FastAPI Server

```bash
cd backend/postgresServer

# Activate virtual environment
source venv/bin/activate

# Run the server
python3 main.py
```

Or with uvicorn:
```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Verify Server is Running

Open browser to: http://localhost:8001

You should see:
```json
{
  "status": "running",
  "service": "PostgreSQL Data Server",
  "timestamp": "2024-01-01T10:00:00"
}
```

### View API Documentation

Open: http://localhost:8001/docs

This shows all available endpoints with interactive testing.

## Frontend Integration

The frontend is already configured to show data tables on node hover.

### How it Works

1. **Hover over any node** in the workflow canvas
2. After **0.8 seconds**, a data table appears
3. The table shows:
   - First 5 rows of data from PostgreSQL
   - Column headers from the database
   - Pagination controls
   - Auto-refresh timer
   - Last update timestamp

### Components Added

- **`NodeDataTable.jsx`**: Table component with auto-refresh
- **`BaseNode.jsx`**: Modified to show table on hover

### Configuration

Currently, **all nodes fetch from the same table** (`node_data`). 

To implement node-specific tables in the future:
1. Modify the backend API to map node_id to specific tables
2. Update the database with node-specific tables
3. No frontend changes needed!

## Testing

### 1. Test Backend API

```bash
# Health check
curl http://localhost:8001/

# Fetch first 5 rows
curl "http://localhost:8001/api/node-data/node-001?start_row=0&limit=5"

# Fetch next 5 rows
curl "http://localhost:8001/api/node-data/node-001?start_row=5&limit=5"

# List all tables
curl http://localhost:8001/api/tables

# Get table structure
curl http://localhost:8001/api/table-info/node_data
```

### 2. Test Frontend Integration

1. Start the frontend: `npm run dev` (from frontend directory)
2. Navigate to the workflow page
3. Add or open a workflow with nodes
4. Hover over any node for 0.8 seconds
5. Data table should appear showing PostgreSQL data

### 3. Verify Features

✅ Table shows 5 rows at a time
✅ "Previous" and "Next" buttons work
✅ "Refresh" button manually updates data
✅ Timer shows "Next refresh in X seconds"
✅ Shows "Last updated: X seconds/minutes ago"
✅ Auto-refreshes every 10 seconds
✅ Table disappears when mouse leaves node

## API Endpoints

### Get Node Data
```
GET /api/node-data/{node_id}
```

**Query Parameters:**
- `start_row` (int): Starting row index, default: 0
- `limit` (int): Rows per page, default: 5, max: 100
- `table_name` (string): Table name, default: "node_data"

**Response:**
```json
{
  "node_id": "node-001",
  "data": [...],
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

## Troubleshooting

### Issue: "Connection refused" to PostgreSQL

```bash
# Check if PostgreSQL is running
# macOS:
brew services list | grep postgresql

# Ubuntu:
sudo systemctl status postgresql

# Start PostgreSQL if not running
brew services start postgresql
# or
sudo systemctl start postgresql
```

### Issue: "database does not exist"

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE pathway_db;"
```

### Issue: "authentication failed"

Update `.env` file with correct credentials:
```bash
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password
```

### Issue: Frontend can't connect to API

1. Verify backend is running on port 8001
2. Check CORS settings in `main.py`
3. Ensure frontend is making requests to correct URL: `http://localhost:8001`

### Issue: No data shown in table

1. Verify database has data:
   ```bash
   psql -U postgres -d pathway_db -c "SELECT COUNT(*) FROM node_data;"
   ```

2. Check backend logs for errors

3. Open browser console (F12) to see API errors

### Issue: Table not refreshing

1. Check if node is still hovered (table only refreshes when visible)
2. Verify backend server is responding
3. Check browser console for errors

## Adding More Data

### Insert Additional Rows

```sql
-- Connect to database
psql -U postgres -d pathway_db

-- Insert new rows
INSERT INTO node_data (node_id, value, status, message, metadata) VALUES
('node-002', 111.11, 'active', 'New node data', '{"type": "test"}'),
('node-002', 222.22, 'warning', 'Test warning', '{"type": "test"}');

-- Verify
SELECT * FROM node_data WHERE node_id = 'node-002';
```

### Bulk Import from CSV

```bash
# Create a CSV file: data.csv
# id,node_id,value,status,message
# 16,node-003,100.00,active,"Imported data"

# Import
psql -U postgres -d pathway_db -c "\COPY node_data(id,node_id,value,status,message) FROM 'data.csv' DELIMITER ',' CSV HEADER"
```

## Future Enhancements

### Node-Specific Tables

To implement different tables for different nodes:

1. **Backend** - Modify `main.py`:
```python
# Add mapping
NODE_TABLE_MAP = {
    "sensor-node": "sensor_data",
    "processing-node": "processed_data",
    "output-node": "output_data"
}

# Update endpoint
table_name = NODE_TABLE_MAP.get(node_id, "node_data")
```

2. **Database** - Create additional tables:
```sql
CREATE TABLE sensor_data (
    -- Same schema as node_data
);

CREATE TABLE processed_data (
    -- Same schema as node_data
);
```

3. No frontend changes needed!

## Security Notes

🔒 **Production Checklist:**
- [ ] Change default PostgreSQL password
- [ ] Update CORS settings to specific origins
- [ ] Use environment variables (not .env in repo)
- [ ] Enable SSL for PostgreSQL connections
- [ ] Add API authentication/authorization
- [ ] Set up connection pooling
- [ ] Add rate limiting
- [ ] Enable database backups

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review backend logs: Check terminal running `python3 main.py`
3. Review frontend console: Press F12 in browser
4. Verify all services are running: PostgreSQL, Backend API, Frontend

## Quick Reference

```bash
# Start PostgreSQL
brew services start postgresql

# Start Backend API
cd backend/postgresServer
source venv/bin/activate
python3 main.py

# Start Frontend
cd frontend
npm run dev

# Test API
curl http://localhost:8001/api/node-data/node-001?start_row=0&limit=5
```

---

**Setup Complete!** 🎉

You can now hover over nodes in the workflow to see live data from PostgreSQL!


