"""
Test PostgreSQL/Supabase Connection
Quick script to verify database connectivity
"""
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os
from datetime import datetime

# Load environment variables
load_dotenv()

def test_connection():
    """Test database connection and query data"""
    print("=" * 50)
    print("PostgreSQL/Supabase Connection Test")
    print("=" * 50)
    print()
    
    # Display configuration (hide password)
    print("Configuration:")
    print(f"  Host: {os.getenv('POSTGRES_HOST', 'Not set')}")
    print(f"  Port: {os.getenv('POSTGRES_PORT', 'Not set')}")
    print(f"  Database: {os.getenv('POSTGRES_DB', 'Not set')}")
    print(f"  User: {os.getenv('POSTGRES_USER', 'Not set')}")
    print(f"  SSL Mode: {os.getenv('POSTGRES_SSLMODE', 'Not set')}")
    print()
    
    try:
        # Attempt connection
        print("Attempting connection...")
        conn = psycopg2.connect(
            host=os.getenv("POSTGRES_HOST"),
            port=os.getenv("POSTGRES_PORT"),
            database=os.getenv("POSTGRES_DB"),
            user=os.getenv("POSTGRES_USER"),
            password=os.getenv("POSTGRES_PASSWORD"),
            sslmode=os.getenv("POSTGRES_SSLMODE", "prefer")
        )
        print("✓ Connection successful!")
        print()
        
        # Test query
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Count total rows
        print("Testing queries...")
        cursor.execute("SELECT COUNT(*) as count FROM node_data;")
        result = cursor.fetchone()
        total_rows = result['count']
        print(f"✓ Total rows in node_data: {total_rows}")
        
        # Fetch first 5 rows
        cursor.execute("""
            SELECT id, node_id, value, status, message, timestamp
            FROM node_data 
            ORDER BY id 
            LIMIT 5
        """)
        rows = cursor.fetchall()
        
        print(f"✓ Sample data (first 5 rows):")
        print()
        for row in rows:
            print(f"  ID {row['id']}: {row['node_id']} - {row['status']} - {row['message'][:30]}...")
        
        print()
        print("=" * 50)
        print("✅ All tests passed!")
        print("=" * 50)
        print()
        print("Next steps:")
        print("1. Start the FastAPI server: python main.py")
        print("2. Test API: curl http://localhost:8001/")
        print("3. Start frontend and test hover feature")
        print()
        
        cursor.close()
        conn.close()
        
        return True
        
    except psycopg2.Error as e:
        print()
        print("=" * 50)
        print("❌ Database connection failed!")
        print("=" * 50)
        print()
        print(f"Error: {e}")
        print()
        print("Troubleshooting:")
        print("1. Check your .env file has correct credentials")
        print("2. Verify Supabase project is active (not paused)")
        print("3. Check host format: db.xxxxx.supabase.co")
        print("4. Ensure SSL mode is 'require' for Supabase")
        print("5. Verify password is correct")
        print()
        return False
        
    except Exception as e:
        print()
        print("=" * 50)
        print("❌ Unexpected error!")
        print("=" * 50)
        print()
        print(f"Error: {e}")
        print()
        return False


if __name__ == "__main__":
    test_connection()

