import warnings

# Suppress harmless PIL image warnings generated during document ingestion
warnings.filterwarnings("ignore", category=UserWarning, module="PIL.Image")

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
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

class IngestRequest(BaseModel):
    folder_path: str
    skip_media: bool = False

class URLIngestRequest(BaseModel):
    url: str

class ChatRequest(BaseModel):
    chat_id: int
    query: str

class NewChatRequest(BaseModel):
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

@app.get("/api/projects/{project_id}")
async def get_project_details(project_id: int):
    project = database.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    doc_count = rag_engine.get_doc_count(project_id)
    project["doc_count"] = doc_count
    return {"status": "success", "project": project}

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
def create_project(request: ProjectRequest):
    try:
        is_url = request.folder_path.strip().startswith("http://") or request.folder_path.strip().startswith("https://")
        if not is_url and not os.path.isabs(request.folder_path):
            return {"status": "error", "message": "Please provide an absolute path or a valid URL."}
            
        try:
            project_id = database.create_project(request.name, request.folder_path)
        except Exception as e:
             return {"status": "error", "message": f"Project already exists or error: {str(e)}"}
             
        if is_url:
            doc_count = rag_engine.ingest_url(request.folder_path.strip(), f"project_{project_id}")
            message = "Successfully ingested URL."
        else:
            doc_count = rag_engine.ingest_folder(request.folder_path, f"project_{project_id}", request.skip_media)
            message = f"Successfully ingested {doc_count} documents."
            
        return {"status": "success", "project_id": project_id, "message": message}
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

@app.get("/api/projects/{project_id}/chats")
async def get_project_chats(project_id: int):
    chats = database.get_chats(project_id)
    return {"status": "success", "chats": chats}

@app.post("/api/projects/{project_id}/ingest")
def ingest_more_documents(project_id: int, request: IngestRequest):
    try:
        project = database.get_project(project_id)
        if not project:
            return {"status": "error", "message": "Project not found"}
            
        if not os.path.isabs(request.folder_path):
            return {"status": "error", "message": "Please provide an absolute path."}
            
        doc_count = rag_engine.ingest_folder(request.folder_path, f"project_{project_id}", request.skip_media)
        return {"status": "success", "message": f"Successfully ingested {doc_count} additional documents."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects/{project_id}/ingest-url")
def ingest_url_endpoint(project_id: int, request: URLIngestRequest):
    try:
        project = database.get_project(project_id)
        if not project:
            return {"status": "error", "message": "Project not found"}
            
        if not request.url.startswith("http"):
            return {"status": "error", "message": "Invalid URL. Must start with http or https."}
            
        doc_count = rag_engine.ingest_url(request.url, f"project_{project_id}")
        return {"status": "success", "message": f"Successfully ingested URL."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects/{project_id}/chats/create")
async def create_empty_chat(project_id: int, request: NewChatRequest):
    try:
        project = database.get_project(project_id)
        if not project:
            return {"status": "error", "message": "Project not found"}

        title = request.query[:40] + ("..." if len(request.query) > 40 else "") if request.query else "New Chat"
        chat_id = database.create_chat(project_id, title)
        
        return {"status": "success", "chat_id": chat_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chats/{chat_id}/history")
async def get_chat_history(chat_id: int):
    history = database.get_messages(chat_id)
    return {"status": "success", "history": history}

@app.delete("/api/chats/{chat_id}")
async def delete_chat(chat_id: int):
    try:
        database.delete_chat(chat_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chats/stream")
async def send_chat_message_stream(request: ChatRequest):
    try:
        chat = database.get_chat(request.chat_id)
        if not chat:
            return {"status": "error", "message": "Chat not found"}
            
        history = database.get_messages(request.chat_id)
        database.add_message(request.chat_id, "user", request.query)
        
        project_name = f"project_{chat['project_id']}"
        
        async def generate():
            full_response = ""
            async for token in rag_engine.stream_chat(request.query, project_name, history):
                full_response += token
                yield token
            database.add_message(request.chat_id, "bot", full_response)
            
        return StreamingResponse(generate(), media_type="text/plain")
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
