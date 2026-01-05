import sys
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add current directory to path so we can import our modules
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

from routes import workspaces, files, execute, terminal

app = FastAPI(title="Data Studio Jupyter Bridge")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup Event
@app.on_event("startup")
async def startup_event():
    print("Data Studio Backend Started")
    print("Registered Routes:")
    for route in app.routes:
        print(f" - {route.path}")

# Include Routers
app.include_router(workspaces.router)
app.include_router(files.router)
app.include_router(execute.router)
app.include_router(terminal.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
