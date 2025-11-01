from fastapi import FastAPI, Request


app = FastAPI(title="Pipeline API")

@app.get("/")
def root() -> dict[str, str]:
    return {"status": "ok", "message": "Pipeline API is running"}