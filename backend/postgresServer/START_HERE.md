# 🚀 PostgreSQL Data Server - Quick Start

## What is This?

This server displays live PostgreSQL data in a table when you hover over workflow nodes. Data auto-refreshes every 10 seconds with navigation controls.

## ⚡ Quick Setup (Neon DB Recommended)

### 1. Create Neon DB Account
- Go to [neon.tech](https://neon.tech) and sign up (FREE, no credit card!)
- Create a new project (instant setup!)
- Copy the connection details shown

### 2. Setup Database Table
- Open **SQL Editor** in Neon dashboard
- Copy & paste SQL from `setup_database.sql`
- Click **Run** - this creates the table and adds sample data

### 3. Get Your Credentials
- In Neon dashboard → **Connection Details**
- Copy the connection string:
  - **Host**: `ep-xxxxx.us-east-2.aws.neon.tech`
  - **Database**: `neondb`
  - **User**: `neondb_owner`
  - **Password**: (shown in connection details)

### 4. Configure Backend
Create a `.env` file in this directory:
```bash
POSTGRES_HOST=ep-your-project.us-east-2.aws.neon.tech
POSTGRES_PORT=5432
POSTGRES_DB=neondb
POSTGRES_USER=neondb_owner
POSTGRES_PASSWORD=your_neon_password_here
POSTGRES_SSLMODE=require
SERVER_PORT=8001
```

### 5. Install & Run
```bash
# Install dependencies
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Test connection
python test_connection.py

# Start server
python main.py
```

### 6. Test in Frontend
1. Start frontend: `cd ../frontend && npm run dev`
2. Open workflow page
3. **Hover over any node for 0.8 seconds**
4. See data table appear! 🎉

## 📚 Documentation

- **Neon DB Setup** (Recommended): `NEON_SETUP.md`
- **Supabase Setup** (Alternative): `SUPABASE_SETUP.md`
- **Local PostgreSQL**: `README.md`
- **Complete Guide**: `../../NODE_DATA_TABLE_IMPLEMENTATION.md`

## ✅ Verify It's Working

### Test Backend API
```bash
# Health check
curl http://localhost:8001/

# Get data
curl "http://localhost:8001/api/node-data/node-001?start_row=0&limit=5"
```

### API Documentation
Open browser: http://localhost:8001/docs

## 🐛 Common Issues

**"Connection refused"**
- Check if server is running
- Verify port 8001 is not in use

**"Authentication failed"**
- Double-check password in `.env`
- Copy password again from Neon dashboard (Connection Details)
- Verify Neon project is active (auto-wakes if suspended)

**"SSL required"**
- Ensure `POSTGRES_SSLMODE=require` in `.env`

## 🎯 What You Get

- ✅ Hover over nodes to see data
- ✅ 5 rows per page
- ✅ Previous/Next navigation
- ✅ Auto-refresh every 10 seconds
- ✅ Manual refresh button
- ✅ Live countdown timer
- ✅ "Last updated" timestamp

## 📞 Need Help?

1. Check `NEON_SETUP.md` for detailed guide
2. Run `python test_connection.py` to diagnose issues
3. Check server logs for errors

---

**Ready in 3 minutes!** ⏱️

Start with `NEON_SETUP.md` for step-by-step instructions.

