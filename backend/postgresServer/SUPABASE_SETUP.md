# Supabase PostgreSQL Setup Guide

Complete guide for using Supabase as your PostgreSQL database for the Node Data Table feature.

## Table of Contents
1. [What is Supabase?](#what-is-supabase)
2. [Creating a Supabase Project](#creating-a-supabase-project)
3. [Getting Database Credentials](#getting-database-credentials)
4. [Setting Up the Table](#setting-up-the-table)
5. [Configuring the Backend](#configuring-the-backend)
6. [Testing Connection](#testing-connection)
7. [Adding Sample Data](#adding-sample-data)
8. [Troubleshooting](#troubleshooting)

## What is Supabase?

Supabase is an open-source Firebase alternative that provides:
- **Hosted PostgreSQL database** (no local installation needed)
- **Free tier** with generous limits
- **Web-based SQL editor**
- **Automatic backups**
- **Real-time capabilities**

Perfect for development and production!

## Creating a Supabase Project

### Step 1: Sign Up

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with GitHub, Google, or email

### Step 2: Create New Project

1. Click **"New Project"**
2. Fill in:
   - **Name**: `pathway-node-data` (or any name you prefer)
   - **Database Password**: Create a strong password (SAVE THIS!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Select **Free** tier
3. Click **"Create new project"**
4. Wait 2-3 minutes for project to be provisioned

## Getting Database Credentials

### Step 1: Access Database Settings

1. In your Supabase project dashboard
2. Click on **"Settings"** (gear icon in left sidebar)
3. Click on **"Database"**

### Step 2: Copy Connection Details

Scroll down to **"Connection string"** section. You'll see:

**Connection pooling:**
```
postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**Direct connection:**
```
postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

**Use Direct Connection for this application!**

### Step 3: Extract Credentials

From the connection string:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

Extract:
- **Host**: `db.[PROJECT-REF].supabase.co`
- **Port**: `5432`
- **Database**: `postgres`
- **User**: `postgres`
- **Password**: Your password from project creation

## Setting Up the Table

### Method 1: Using Supabase SQL Editor (Recommended)

1. In Supabase dashboard, click **"SQL Editor"** (left sidebar)
2. Click **"New query"**
3. Copy and paste the following SQL:

```sql
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_node_data_node_id ON node_data(node_id);
CREATE INDEX IF NOT EXISTS idx_node_data_timestamp ON node_data(timestamp);

-- Insert sample data (15 rows)
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

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
CREATE TRIGGER update_node_data_updated_at 
    BEFORE UPDATE ON node_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Verify data
SELECT COUNT(*) as total_rows FROM node_data;
```

4. Click **"Run"** (or press Ctrl/Cmd + Enter)
5. You should see "Success. No rows returned" message
6. Verify by running: `SELECT * FROM node_data LIMIT 5;`

### Method 2: Using Table Editor (Visual)

1. Click **"Table Editor"** in left sidebar
2. Click **"Create a new table"**
3. Name: `node_data`
4. Add columns manually (use SQL method instead, it's easier)

## Configuring the Backend

### Step 1: Create .env File

In `backend/postgresServer/` directory, create a `.env` file:

```bash
# Supabase PostgreSQL Configuration
POSTGRES_HOST=db.xxxxxxxxxxxxx.supabase.co
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_supabase_password_here

# Server Configuration
SERVER_PORT=8001
```

**Replace:**
- `xxxxxxxxxxxxx` with your project reference (from connection string)
- `your_supabase_password_here` with your actual password

### Step 2: Example Configuration

Here's a complete example:

```env
# Supabase Connection (Direct)
POSTGRES_HOST=db.abcdefghijklmno.supabase.co
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=MySuper$ecureP@ssw0rd123!

# Server
SERVER_PORT=8001
```

### Step 3: Install Dependencies

```bash
cd backend/postgresServer

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install packages
pip install -r requirements.txt
```

## Testing Connection

### Step 1: Test Database Connection

Create a test script `test_connection.py`:

```python
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

try:
    conn = psycopg2.connect(
        host=os.getenv("POSTGRES_HOST"),
        port=os.getenv("POSTGRES_PORT"),
        database=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD")
    )
    print("✓ Connection successful!")
    
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM node_data;")
    count = cursor.fetchone()[0]
    print(f"✓ Found {count} rows in node_data table")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"✗ Connection failed: {e}")
```

Run it:
```bash
python test_connection.py
```

### Step 2: Start the FastAPI Server

```bash
python main.py
```

You should see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8001
```

### Step 3: Test API Endpoints

```bash
# Health check
curl http://localhost:8001/

# Fetch first 5 rows
curl "http://localhost:8001/api/node-data/node-001?start_row=0&limit=5"

# Should return JSON with 5 rows of data
```

## Adding Sample Data

### Using Supabase SQL Editor

```sql
-- Add more sample data
INSERT INTO node_data (node_id, value, status, message, metadata) VALUES
('node-002', 111.11, 'active', 'Node 2 data row 1', '{"type": "processor", "location": "server-A"}'),
('node-002', 222.22, 'active', 'Node 2 data row 2', '{"type": "processor", "location": "server-A"}'),
('node-002', 333.33, 'warning', 'Node 2 high load', '{"type": "processor", "location": "server-B"}'),
('node-003', 444.44, 'active', 'Node 3 data row 1', '{"type": "output", "destination": "kafka"}'),
('node-003', 555.55, 'active', 'Node 3 data row 2', '{"type": "output", "destination": "kafka"}');

-- Verify
SELECT node_id, COUNT(*) as row_count 
FROM node_data 
GROUP BY node_id;
```

### Using Supabase Table Editor

1. Go to **"Table Editor"**
2. Select **"node_data"** table
3. Click **"Insert"** → **"Insert row"**
4. Fill in the values manually
5. Click **"Save"**

## Frontend Integration

The frontend is already configured! Just make sure:

1. ✅ Backend server is running on port 8001
2. ✅ Supabase database is set up with node_data table
3. ✅ Frontend is running (`npm run dev`)

### Testing in Frontend

1. Navigate to workflow page
2. Add or open a workflow with nodes
3. **Hover over any node for 0.8 seconds**
4. Data table should appear with Supabase data!

## Supabase Dashboard Features

### View Data in Real-Time

1. Go to **"Table Editor"**
2. Select **"node_data"** table
3. See all rows with pagination
4. Filter, sort, and edit directly

### Monitor API Usage

1. Go to **"Settings"** → **"Database"**
2. See connection statistics
3. Monitor active connections

### Enable Row Level Security (Optional)

For production, add security:

```sql
-- Enable RLS
ALTER TABLE node_data ENABLE ROW LEVEL SECURITY;

-- Create policy (example: allow all for now)
CREATE POLICY "Allow all operations" 
ON node_data 
FOR ALL 
USING (true);
```

## Troubleshooting

### Issue: "connection to server failed"

**Solution 1:** Check your connection details
```bash
# Verify in .env file:
# - Host is correct (db.xxxxx.supabase.co)
# - Password is correct
# - Port is 5432 (not 6543)
```

**Solution 2:** Check Supabase project status
- Go to Supabase dashboard
- Ensure project is active (green dot)
- Check if project is paused (free tier pauses after inactivity)

### Issue: "SSL required"

Supabase requires SSL. The backend is already configured for this.

If you get SSL errors, update connection in `main.py`:

```python
DB_CONFIG = {
    "host": os.getenv("POSTGRES_HOST"),
    "port": int(os.getenv("POSTGRES_PORT")),
    "database": os.getenv("POSTGRES_DB"),
    "user": os.getenv("POSTGRES_USER"),
    "password": os.getenv("POSTGRES_PASSWORD"),
    "sslmode": "require"  # Add this for Supabase
}
```

### Issue: "password authentication failed"

1. Double-check password in `.env` file
2. Reset password in Supabase:
   - Go to **Settings** → **Database**
   - Click **"Reset database password"**
   - Update `.env` file

### Issue: "table does not exist"

1. Verify table creation in Supabase SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

2. If not present, run the setup SQL again

### Issue: "too many connections"

Supabase free tier limits connections. Solutions:

1. **Use connection pooling** (port 6543)
2. **Close connections properly** (already done in code)
3. **Upgrade plan** for more connections

## Supabase Free Tier Limits

- ✅ 500 MB database space
- ✅ Unlimited API requests
- ✅ Up to 2 GB bandwidth per month
- ✅ Up to 50 MB file uploads
- ✅ Social OAuth providers

**Perfect for development and testing!**

## Production Checklist

When deploying to production:

- [ ] Change database password to strong password
- [ ] Enable Row Level Security (RLS)
- [ ] Set up database backups
- [ ] Monitor connection usage
- [ ] Set up alerts for errors
- [ ] Use connection pooling if needed
- [ ] Consider upgrading to Pro plan for better performance

## Advantages of Supabase

✅ **No local installation** - Works anywhere with internet
✅ **Free hosting** - No server costs during development
✅ **Web interface** - Easy data viewing and editing
✅ **Automatic backups** - Data is safe
✅ **Built-in security** - SSL by default
✅ **Scalable** - Easy to upgrade as you grow
✅ **Real-time** - Can add real-time subscriptions later

## Next Steps

1. ✅ Set up Supabase project
2. ✅ Create node_data table
3. ✅ Configure backend with .env
4. ✅ Test connection
5. ✅ Start backend server
6. ✅ Test in frontend

**You're all set!** 🎉

Your Node Data Table feature is now powered by Supabase!

## Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [PostgreSQL Tutorial](https://www.postgresql.org/docs/current/tutorial.html)

## Quick Commands Reference

```bash
# Start backend server
cd backend/postgresServer
source venv/bin/activate
python main.py

# Test API
curl "http://localhost:8001/api/node-data/node-001?start_row=0&limit=5"

# View logs
# Just watch the terminal where server is running
```

---

**Ready to go!** Hover over nodes to see your Supabase data! 🚀

