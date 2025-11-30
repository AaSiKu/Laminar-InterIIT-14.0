# Neon DB PostgreSQL Setup Guide

Complete guide for using Neon DB as your PostgreSQL database for the Node Data Table feature.

## Table of Contents
1. [What is Neon DB?](#what-is-neon-db)
2. [Creating a Neon Project](#creating-a-neon-project)
3. [Getting Database Credentials](#getting-database-credentials)
4. [Setting Up the Table](#setting-up-the-table)
5. [Configuring the Backend](#configuring-the-backend)
6. [Testing Connection](#testing-connection)
7. [Adding Sample Data](#adding-sample-data)
8. [Troubleshooting](#troubleshooting)

## What is Neon DB?

Neon is a fully managed serverless PostgreSQL database that provides:
- **Serverless PostgreSQL** (no local installation needed)
- **Generous free tier** (512 MB storage, 10 projects)
- **Instant branching** - Git-like database branches
- **Auto-scaling** - Scales to zero when not in use
- **Built-in connection pooling**
- **SQL Editor** in dashboard

Perfect for development and production!

## Creating a Neon Project

### Step 1: Sign Up

1. Go to [neon.tech](https://neon.tech)
2. Click **"Sign Up"**
3. Sign up with GitHub, Google, or email
4. No credit card required for free tier! 🎉

### Step 2: Create New Project

1. After signing in, click **"New Project"**
2. Fill in:
   - **Project Name**: `pathway-node-data` (or any name)
   - **PostgreSQL Version**: Select **16** (latest)
   - **Region**: Choose closest to you (US East, Europe, Asia)
3. Click **"Create Project"**
4. Project is ready instantly! ⚡

## Getting Database Credentials

### Step 1: Access Dashboard

After project creation, you'll see the **Connection Details** page.

### Step 2: Copy Connection String

Neon provides different connection strings:

#### **Option 1: Connection String (Recommended)**
```
postgresql://neondb_owner:your-password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

#### **Option 2: Individual Parameters**
```
Host: ep-xxxxx.us-east-2.aws.neon.tech
Database: neondb
User: neondb_owner
Password: your-password-here
Port: 5432
```

### Step 3: Save Credentials

**Important:** Save these credentials! You can always access them from:
- Dashboard → Select your project → **"Connection Details"** tab

### Connection String Breakdown

From this connection string:
```
postgresql://neondb_owner:AbCd1234EfGh@ep-cool-mountain-12345678.us-east-2.aws.neon.tech/neondb?sslmode=require
```

Extract:
- **Host**: `ep-cool-mountain-12345678.us-east-2.aws.neon.tech`
- **Database**: `neondb`
- **User**: `neondb_owner`
- **Password**: `AbCd1234EfGh`
- **Port**: `5432` (default)
- **SSL**: Required

## Setting Up the Table

### Method 1: Using Neon SQL Editor (Recommended)

1. In Neon dashboard, click **"SQL Editor"** in left sidebar
2. Click **"New Query"**
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
5. You should see "Query executed successfully" with results
6. Verify by running: `SELECT * FROM node_data LIMIT 5;`

### Method 2: Using psql Command Line

If you have psql installed:

```bash 
# Connect to Neon
psql "postgresql://neondb_owner:your-password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Run setup script
\i setup_database.sql

# Or paste the SQL directly
# Exit with \q
```

## Configuring the Backend

### Step 1: Create .env File

In `backend/postgresServer/` directory, create a `.env` file:

```bash
# Neon DB PostgreSQL Configuration
POSTGRES_HOST=ep-xxxxx-xxxxx.us-east-2.aws.neon.tech
POSTGRES_PORT=5432
POSTGRES_DB=neondb
POSTGRES_USER=neondb_owner
POSTGRES_PASSWORD=your_neon_password_here
POSTGRES_SSLMODE=require

# Server Configuration
SERVER_PORT=8001
```

### Step 2: Example Configuration

Here's a complete example with real-looking values:

```env
# Neon DB Connection
POSTGRES_HOST=ep-cool-mountain-12345678.us-east-2.aws.neon.tech
POSTGRES_PORT=5432
POSTGRES_DB=neondb
POSTGRES_USER=neondb_owner
POSTGRES_PASSWORD=AbCd1234EfGh5678IjKl
POSTGRES_SSLMODE=require

# Server
SERVER_PORT=8001
```

### Step 3: Find Your Connection Details

**In Neon Dashboard:**
1. Select your project
2. Click **"Dashboard"** or **"Connection Details"**
3. Copy values from there

**Host format:** `ep-<random-name>-<random-id>.<region>.aws.neon.tech`

### Step 4: Install Dependencies

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

```bash
cd backend/postgresServer
source venv/bin/activate
python test_connection.py
```

You should see:
```
==================================================
PostgreSQL/Supabase Connection Test
==================================================

Configuration:
  Host: ep-cool-mountain-12345678.us-east-2.aws.neon.tech
  Port: 5432
  Database: neondb
  User: neondb_owner
  SSL Mode: require

Attempting connection...
✓ Connection successful!

Testing queries...
✓ Total rows in node_data: 15
✓ Sample data (first 5 rows):
  ID 1: node-001 - active - Sample data row 1...
  ID 2: node-001 - active - Sample data row 2...
  ...

==================================================
✅ All tests passed!
==================================================
```

### Step 2: Start the FastAPI Server

```bash
python main.py
```

You should see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO:     Application startup complete.
```

### Step 3: Test API Endpoints

Open a new terminal:

```bash
# Health check
curl http://localhost:8001/

# Expected response:
# {"status":"running","service":"PostgreSQL Data Server","timestamp":"..."}

# Fetch first 5 rows
curl "http://localhost:8001/api/node-data/node-001?start_row=0&limit=5"

# Should return JSON with 5 rows of data
```

### Step 4: View API Documentation

Open browser: http://localhost:8001/docs

Interactive API documentation with test interface!

## Adding Sample Data

### Using Neon SQL Editor

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
GROUP BY node_id 
ORDER BY node_id;
```

### Bulk Import (Advanced)

```sql
-- From CSV file
COPY node_data(node_id, value, status, message)
FROM '/path/to/data.csv'
DELIMITER ','
CSV HEADER;
```

## Frontend Integration

The frontend is already configured! Just make sure:

1. ✅ Backend server is running on port 8001
2. ✅ Neon database is set up with node_data table
3. ✅ Frontend is running (`npm run dev`)

### Testing in Frontend

1. Navigate to workflow page
2. Add or open a workflow with nodes
3. **Hover over any node for 0.8 seconds**
4. Data table should appear with Neon data! 🎉

## Neon Dashboard Features

### SQL Editor
- Write and execute queries
- Save common queries
- View query results in table format
- Export results as CSV

### Tables View
1. Click **"Tables"** in sidebar
2. See all tables, columns, indexes
3. Browse data directly
4. Check table sizes and row counts

### Monitoring
1. Click **"Monitoring"** in sidebar
2. View:
   - Database connections
   - Query performance
   - Storage usage
   - Compute time (billed metric)

### Branching (Unique Feature!)
1. Click **"Branches"** in sidebar
2. Create database branches (like Git!)
3. Test changes without affecting main
4. Perfect for development/staging

## Troubleshooting

### Issue: "connection to server failed"

**Check 1:** Verify connection string
```bash
# Make sure .env has correct values
cat backend/postgresServer/.env

# Host should be: ep-xxxxx.xxx.aws.neon.tech
# Not localhost or other services
```

**Check 2:** Verify project is active
- Go to Neon dashboard
- Check if project shows "Active" status
- Neon free tier auto-suspends after inactivity (wakes up automatically)

**Check 3:** SSL is required
```bash
# Ensure in .env:
POSTGRES_SSLMODE=require
```

### Issue: "password authentication failed"

1. **Copy password again** from Neon dashboard:
   - Dashboard → Connection Details → Show password
   - Copy and paste into `.env` (no extra spaces!)

2. **Reset password** if needed:
   - Dashboard → Settings → Reset password
   - Update `.env` file

### Issue: "SSL SYSCALL error"

This usually means the connection was interrupted. Solutions:

1. **Check internet connection**
2. **Retry** - Neon might be auto-waking from suspend
3. **Verify host** - Make sure it's the correct endpoint

### Issue: "database does not exist"

**For Neon:** The default database is `neondb` (not `postgres`)

Update `.env`:
```bash
POSTGRES_DB=neondb  # Not postgres!
```

### Issue: "table does not exist"

1. Verify table creation in Neon SQL Editor:
```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public';
```

2. If not present, run setup SQL again

### Issue: "too many connections"

Neon free tier: 100 concurrent connections

Solutions:
1. **Close connections properly** (already done in code)
2. **Use connection pooling** (built into Neon)
3. **Check for connection leaks** in your code

## Neon Free Tier Limits

- ✅ **512 MB storage** per project
- ✅ **10 projects** total
- ✅ **100 concurrent connections**
- ✅ **Unlimited queries**
- ✅ **191.9 hours/month** compute time (plenty for development!)
- ✅ **Auto-suspend** when inactive (saves compute)

**Perfect for development and small production workloads!**

## Neon Advantages

✅ **Serverless** - Auto-scales to zero, pay only for compute used
✅ **Instant branching** - Copy entire database instantly
✅ **Fast provisioning** - New projects in seconds
✅ **Built-in pooling** - Connection pooling included
✅ **Point-in-time restore** - Restore to any point in last 7 days (paid)
✅ **No cold starts** - Fast wake-up from suspend
✅ **Modern UI** - Clean, intuitive dashboard
✅ **PostgreSQL 16** - Latest features

## Connection Pooling (Advanced)

Neon provides connection pooling endpoints:

### Pooled Connection
```
postgresql://neondb_owner:password@ep-xxxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
```

Notice: `-pooler` in hostname

**When to use:**
- Many concurrent connections
- Serverless functions (Lambda, Vercel)
- High-traffic applications

**For this app:** Direct connection is fine (already efficient)

## Production Checklist

- [ ] Use strong, unique password
- [ ] Enable IP allowlist if needed (Settings → Security)
- [ ] Set up monitoring alerts
- [ ] Consider upgrading for production features
- [ ] Use connection pooling for high traffic
- [ ] Set up branches for staging environment
- [ ] Monitor compute usage (Dashboard → Monitoring)

## Neon vs Other Providers

| Feature | Neon | Supabase | Local |
|---------|------|----------|-------|
| Setup Time | 30 seconds | 2 minutes | 15 minutes |
| Free Tier | ✅ Generous | ✅ Good | ✅ Free |
| Branching | ✅ Yes | ❌ No | ❌ No |
| Auto-suspend | ✅ Yes | ❌ No | N/A |
| SQL Editor | ✅ Yes | ✅ Yes | ❌ No |
| Connection Pooling | ✅ Built-in | ✅ Built-in | Manual |
| Cold Start | 🚀 Fast | N/A | N/A |

## Next Steps

1. ✅ Set up Neon project
2. ✅ Create node_data table
3. ✅ Configure backend with .env
4. ✅ Test connection
5. ✅ Start backend server
6. ✅ Test in frontend

**You're all set!** 🎉

Your Node Data Table feature is now powered by Neon DB!

## Support Resources

- [Neon Documentation](https://neon.tech/docs)
- [Neon Discord](https://discord.gg/92vNTzKDGp)
- [Neon Blog](https://neon.tech/blog)
- [PostgreSQL Tutorial](https://www.postgresql.org/docs/current/tutorial.html)

## Quick Commands Reference

```bash
# Test connection
cd backend/postgresServer
source venv/bin/activate
python test_connection.py

# Start backend server
python main.py

# Test API
curl "http://localhost:8001/api/node-data/node-001?start_row=0&limit=5"

# Connect with psql
psql "postgresql://neondb_owner:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

---

**Ready to go!** Hover over nodes to see your Neon DB data! 🚀

**Unique Neon Features to Try:**
- Create a branch: Test queries safely
- Auto-suspend: Watch it wake up on first query
- Time-travel: Query historical data

