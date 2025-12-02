#!/bin/bash

# QuickStart Script for PostgreSQL Data Server
# This script helps you quickly set up and run the server

set -e

echo "========================================="
echo "PostgreSQL Data Server - QuickStart"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PostgreSQL is installed
echo -e "${YELLOW}Checking PostgreSQL installation...${NC}"
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL is installed${NC}"
    psql --version
else
    echo -e "${RED}✗ PostgreSQL is not installed${NC}"
    echo "Please install PostgreSQL first:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

# Check if Python is installed
echo ""
echo -e "${YELLOW}Checking Python installation...${NC}"
if command -v python3 &> /dev/null; then
    echo -e "${GREEN}✓ Python is installed${NC}"
    python3 --version
else
    echo -e "${RED}✗ Python 3 is not installed${NC}"
    exit 1
fi

# Check if .env file exists
echo ""
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << EOF
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=pathway_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
SERVER_PORT=8001
EOF
    echo -e "${GREEN}✓ Created .env file (please update with your credentials)${NC}"
fi

# Install Python dependencies
echo ""
echo -e "${YELLOW}Installing Python dependencies...${NC}"
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✓ Created virtual environment${NC}"
fi

source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo -e "${GREEN}✓ Installed dependencies${NC}"

# Setup database
echo ""
echo -e "${YELLOW}Setting up database...${NC}"
echo "Creating database and tables..."

# Try to create database and run setup script
PGPASSWORD=postgres psql -U postgres -h localhost << EOF
-- Create database if it doesn't exist
SELECT 'CREATE DATABASE pathway_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pathway_db')\gexec

-- Connect to the database
\c pathway_db

-- Run the setup script
\i setup_database.sql

EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database setup complete${NC}"
else
    echo -e "${RED}✗ Database setup failed${NC}"
    echo "Please ensure PostgreSQL is running and credentials are correct"
    echo "You can manually run: psql -U postgres -h localhost -f setup_database.sql"
fi

# Start the server
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Starting FastAPI server...${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Server will be available at: http://localhost:8001"
echo "API docs available at: http://localhost:8001/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python3 main.py


