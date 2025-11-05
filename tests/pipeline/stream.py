import asyncio
import json
from faker import Faker
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, HTMLResponse
import uvicorn
# Initialize FastAPI app and Faker
app = FastAPI()
fake = Faker()

async def user_generator():
    """
    Async generator to continuously create fake user data.
    It yields data in the Server-Sent Event (SSE) format.
    """
    while True:
        # 1. Generate fake user data
        user_data = {
            "id": str(fake.uuid4()),
            "name": fake.name(),
            "email": fake.email(),
            "job": fake.job()
        }
        
        # 2. Format as a Server-Sent Event (SSE)
        # The format is "data: <your_json_string>\n\n"\

        # NOTE: the below cmd can only be used for python connector for frontend use
        # yield f"data: {json.dumps(user_data)}\n\n"
        yield f"{json.dumps(user_data)} \n"

        # 3. Wait for 1 second before generating the next user
        # This keeps the stream going without overwhelming the server
        await asyncio.sleep(1)

async def frontend_user_generator():
    async for val in user_generator():
        # Wrap each JSON line in proper SSE format
        yield f"data: {val}\n\n"

@app.get("/stream-users")
async def stream_users(request: Request):
    """
    The endpoint that streams the user data.
    We set the media type to "text/event-stream" for SSE.
    """
    frontend = request.query_params.get("frontend")
    return StreamingResponse(frontend_user_generator() if frontend=="true" else user_generator(), media_type="text/event-stream")

@app.get("/")
async def get_client_page():
    """
    Serves a simple HTML page with JavaScript
    to connect to the streaming endpoint.
    """
    html_content = """
    <html>
        <head>
            <title>Live User Stream</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #f0f2f5; }
                h1 { text-align: center; color: #333; }
                #feed { 
                    width: 60%; 
                    margin: 0 auto; 
                    background-color: #fff; 
                    border-radius: 8px; 
                    padding: 20px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                pre { 
                    background-color: #f8f8f8; 
                    border: 1px solid #ddd; 
                    border-radius: 4px;
                    padding: 10px; 
                    margin-bottom: 10px;
                    font-size: 0.9em;
                    overflow-x: auto;
                }
            </style>
        </head>
        <body>
            <div id="feed">
                </div>

            <script>
                const feed = document.getElementById('feed');
                
                // 1. Create a new EventSource to connect to our endpoint
                const eventSource = new EventSource('/stream-users?frontend=true');
                
                // 2. Define what to do when a message is received
                eventSource.onmessage = (event) => {
                    // Parse the data (which is a JSON string)
                    const user = JSON.parse(event.data);
                    // Create a new element to display the user
                    const userElement = document.createElement('pre');
                    userElement.textContent = JSON.stringify(user, null, 2);
                    
                    // Add the new user to the top of the feed
                    feed.prepend(userElement);
                };
                
                // 3. (Optional) Handle connection errors
                eventSource.onerror = (err) => {
                    console.error("EventSource failed:", err);
                    feed.prepend("<p style='color: red;'>Connection lost. Retrying...</p>");
                };
            </script>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content)

if __name__ == "__main__":
    uvicorn.run("stream:app", host="0.0.0.0", port=5050, reload=True)