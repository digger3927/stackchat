import os
from pathlib import Path
import chromadb
import requests
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.core import Settings
from llama_index.core.llms import ChatMessage, MessageRole

# Configure Ollama models
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
    def __init__(self):
        self.current_model = default_model
        self.index = None
        self.collection_name = None

    def load_project(self, project_name: str):
        if self.collection_name == project_name and self.index is not None:
            return # Already loaded
            
        self.collection_name = project_name
        self.chroma_collection = db.get_or_create_collection(self.collection_name)
        self.vector_store = ChromaVectorStore(chroma_collection=self.chroma_collection)
        self.storage_context = StorageContext.from_defaults(vector_store=self.vector_store)
        
        try:
            self.index = VectorStoreIndex.from_vector_store(
                self.vector_store,
                storage_context=self.storage_context
            )
        except Exception as e:
            print(f"No existing index found or error loading: {e}")
            self.index = None

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

    def get_doc_count(self, project_id: int):
        collection_name = f"project_{project_id}"
        try:
            col = db.get_collection(collection_name)
            return col.count()
        except ValueError:
            return 0

    def set_model(self, model_name: str):
        self.current_model = model_name
        llm = Ollama(model=model_name, request_timeout=120.0)
        Settings.llm = llm

    def ingest_folder(self, folder_path: str, project_name: str, skip_media: bool = False):
        """Scans folder, extracts text, generates embeddings, and stores them in ChromaDB."""
        if not os.path.exists(folder_path):
            raise FileNotFoundError(f"Folder not found: {folder_path}")
            
        self.load_project(project_name)
            
        exclude_patterns = None
        if skip_media:
            exclude_patterns = ["*.mp4", "*.mkv", "*.avi", "*.mov", "*.mp3", "*.wav", "*.m4a", "*.flac", "*.wmv", "*.webm", "*.ogg", "*.aac", "*.wma"]
            
        reader = SimpleDirectoryReader(
            input_dir=folder_path,
            recursive=True,
            exclude=exclude_patterns
        )
        
        documents = reader.load_data()
        
        # Create or update index
        self.index = VectorStoreIndex.from_documents(
            documents, storage_context=self.storage_context
        )
        
        return len(documents)

    def ingest_url(self, url: str, project_name: str):
        """Fetches a URL, extracts text, generates embeddings, and stores them in ChromaDB."""
        import requests
        from bs4 import BeautifulSoup
        from llama_index.core import Document
        
        self.load_project(project_name)
        
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        for script in soup(["script", "style"]):
            script.extract()
            
        text = soup.get_text(separator=' ')
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        doc = Document(text=text, metadata={"source": url})
        
        if self.index:
            self.index.insert(doc)
        else:
            self.index = VectorStoreIndex.from_documents(
                [doc], storage_context=self.storage_context
            )
            
        return 1

    def chat(self, query: str, project_name: str, chat_history: list):
        """Queries the vector index using the LLM and retrieved context with history."""
        self.load_project(project_name)
        
        if not self.index:
            return "No documents have been ingested for this project yet."
            
        formatted_history = []
        for msg in chat_history:
            role = MessageRole.USER if msg["role"] == "user" else MessageRole.ASSISTANT
            formatted_history.append(ChatMessage(role=role, content=msg["content"]))
            
        chat_engine = self.index.as_chat_engine(
            chat_mode="context",
            chat_history=formatted_history,
            system_prompt="You are a helpful AI assistant answering questions about the provided documents."
        )
            
        response = chat_engine.chat(query)
        return str(response)

    def stream_chat(self, query: str, project_name: str, chat_history: list):
        """Queries the vector index using the LLM and retrieved context, streaming the response."""
        self.load_project(project_name)
        
        if not self.index:
            yield "No documents have been ingested for this project yet."
            return
            
        formatted_history = []
        for msg in chat_history:
            role = MessageRole.USER if msg["role"] == "user" else MessageRole.ASSISTANT
            formatted_history.append(ChatMessage(role=role, content=msg["content"]))
            
        chat_engine = self.index.as_chat_engine(
            chat_mode="context",
            chat_history=formatted_history,
            system_prompt="You are a helpful AI assistant answering questions about the provided documents."
        )
            
        response = chat_engine.stream_chat(query)
        for token in response.response_gen:
            yield token

# Singleton instance
rag_engine = RAGEngine()
