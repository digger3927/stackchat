from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import subprocess
import sys
from rag_engine import rag_engine
import database

app = FastAPI(title="Local RAG API")

# Setup CORS to allow Vite frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProjectRequest(BaseModel):
    name: str
    folder_path: str
    skip_media: bool = False

class ChatRequest(BaseModel):
    project_id: int
    query: str

class SetModelRequest(BaseModel):
    model_name: str

class RenameRequest(BaseModel):
    name: str

class PinRequest(BaseModel):
    pinned: bool

@app.get("/api/projects")
async def get_projects():
    return {"status": "success", "projects": database.get_projects()}

@app.get("/api/select-folder")
async def select_folder():
    try:
        picker_script = os.path.join(os.path.dirname(__file__), "folder_picker.py")
        result = subprocess.run([sys.executable, picker_script], capture_output=True, text=True)
        folder_path = result.stdout.strip()
        return {"status": "success", "folder_path": folder_path}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/projects")
async def create_project(request: ProjectRequest):
    try:
        if not os.path.isabs(request.folder_path):
            return {"status": "error", "message": "Please provide an absolute path."}
            
        try:
            project_id = database.create_project(request.name, request.folder_path)
        except Exception as e:
             return {"status": "error", "message": f"Project already exists or error: {str(e)}"}
             
        doc_count = rag_engine.ingest_folder(request.folder_path, f"project_{project_id}", request.skip_media)
        return {"status": "success", "project_id": project_id, "message": f"Successfully ingested {doc_count} documents."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/projects/{project_id}/rename")
async def rename_project(project_id: int, request: RenameRequest):
    try:
        database.rename_project(project_id, request.name)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/projects/{project_id}/pin")
async def pin_project(project_id: int, request: PinRequest):
    try:
        database.set_project_pinned(project_id, request.pinned)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: int):
    try:
        database.delete_project(project_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects/{project_id}/history")
async def get_project_history(project_id: int):
    history = database.get_messages(project_id)
    return {"status": "success", "history": history}

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        project = database.get_project(request.project_id)
        if not project:
            return {"status": "error", "message": "Project not found"}
            
        history = database.get_messages(request.project_id)
        
        database.add_message(request.project_id, "user", request.query)
        response = rag_engine.chat(request.query, f"project_{request.project_id}", history)
        database.add_message(request.project_id, "bot", response)
        
        return {"status": "success", "response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/models")
async def get_models():
    models = rag_engine.get_available_models()
    return {"status": "success", "models": models, "current_model": rag_engine.current_model}

@app.post("/api/models/set")
async def set_model(request: SetModelRequest):
    try:
        rag_engine.set_model(request.model_name)
        return {"status": "success", "message": f"Model set to {request.model_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/status")
async def status():
    return {
        "status": "online"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
