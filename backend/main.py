from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from rag_engine import rag_engine

app = FastAPI(title="Local RAG API")

# Setup CORS to allow Vite frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IngestRequest(BaseModel):
    folder_path: str

class ChatRequest(BaseModel):
    query: str

@app.post("/api/ingest")
async def ingest_folder(request: IngestRequest):
    try:
        if not os.path.isabs(request.folder_path):
            return {"status": "error", "message": "Please provide an absolute path."}
            
        doc_count = rag_engine.ingest_folder(request.folder_path)
        return {"status": "success", "message": f"Successfully ingested {doc_count} documents."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        response = rag_engine.chat(request.query)
        return {"status": "success", "response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/status")
async def status():
    return {
        "status": "online",
        "has_index": rag_engine.query_engine is not None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
