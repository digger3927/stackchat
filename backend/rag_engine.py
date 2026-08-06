import os
from pathlib import Path
import chromadb
import requests
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.core import Settings

# Configure Ollama models
# We use llama3.2 for chatting and nomic-embed-text for fast local embeddings
default_model = "llama3.2"
llm = Ollama(model=default_model, request_timeout=120.0)
embed_model = OllamaEmbedding(model_name="nomic-embed-text")

# Set global LlamaIndex settings
Settings.llm = llm
Settings.embed_model = embed_model
Settings.chunk_size = 512
Settings.chunk_overlap = 50

# Initialize ChromaDB local storage in the backend folder
DB_DIR = os.path.join(os.path.dirname(__file__), ".chroma_db")
db = chromadb.PersistentClient(path=DB_DIR)

class RAGEngine:
    def __init__(self, collection_name="local_docs"):
        self.current_model = default_model
        self.collection_name = collection_name
        self.chroma_collection = db.get_or_create_collection(self.collection_name)
        self.vector_store = ChromaVectorStore(chroma_collection=self.chroma_collection)
        self.storage_context = StorageContext.from_defaults(vector_store=self.vector_store)
        
        # Load existing index if it exists
        try:
            self.index = VectorStoreIndex.from_vector_store(
                self.vector_store,
                storage_context=self.storage_context
            )
            self.query_engine = self.index.as_query_engine(streaming=False)
        except Exception as e:
            print(f"No existing index found or error loading: {e}")
            self.index = None
            self.query_engine = None

    def get_available_models(self):
        try:
            response = requests.get("http://localhost:11434/api/tags")
            response.raise_for_status()
            models = response.json().get("models", [])
            # Filter out the embedding model from the chat models list
            return [m["name"] for m in models if "embed" not in m["name"]]
        except Exception as e:
            print(f"Error fetching models: {e}")
            return [self.current_model]

    def set_model(self, model_name: str):
        self.current_model = model_name
        llm = Ollama(model=model_name, request_timeout=120.0)
        Settings.llm = llm
        
        # If we have an index, recreate the query engine so it uses the new LLM
        if self.index:
            self.query_engine = self.index.as_query_engine(streaming=False)

    def ingest_folder(self, folder_path: str):
        """Scans folder, extracts text, generates embeddings, and stores them in ChromaDB."""
        if not os.path.exists(folder_path):
            raise FileNotFoundError(f"Folder not found: {folder_path}")
            
        # LlamaIndex's SimpleDirectoryReader handles many file types natively
        # (txt, md, pdf, epub, html) using the right installed dependencies.
        reader = SimpleDirectoryReader(
            input_dir=folder_path,
            recursive=True,
            # We can expand required_exts if we want to restrict, but default is good.
        )
        
        documents = reader.load_data()
        
        # Create or update index
        self.index = VectorStoreIndex.from_documents(
            documents, storage_context=self.storage_context
        )
        self.query_engine = self.index.as_query_engine(streaming=False)
        
        return len(documents)

    def chat(self, query: str):
        """Queries the vector index using the LLM and retrieved context."""
        if not self.query_engine:
            return "No documents have been ingested yet. Please ingest a folder first."
            
        response = self.query_engine.query(query)
        return str(response)

# Singleton instance
rag_engine = RAGEngine()
