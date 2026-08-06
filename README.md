# 📚 StackChat

**StackChat** is a local, privacy-first Retrieval-Augmented Generation (RAG) web application. It lets you select any local folder packed with documents (PDFs, EPUBs, Markdown, Text, HTML, you name it!) and turns them into a searchable, chat-able AI knowledge base.

It’s built for those who want deep document analysis without sending a single byte of their private data to the cloud.

---

## ✨ Features
- **100% Local**: Uses [Ollama](https://ollama.com/) for local LLM inference and embeddings. No cloud APIs, no subscriptions, zero data leaks.
- **Any Document Type**: Throw PDFs, books, code, and notes at it. LlamaIndex handles the heavy lifting of parsing and chunking.
- **Lightning Fast RAG**: Built with ChromaDB to instantly retrieve contextually relevant chunks when you ask a question.
- **Premium Interface**: A sleek, dark-mode glassmorphism UI built with React and raw, lovingly-crafted CSS.

## 🛠️ Tech Stack
- **Backend**: Python, FastAPI, LlamaIndex, ChromaDB
- **Frontend**: React, Vite
- **AI**: Ollama (`llama3.2` for chat, `nomic-embed-text` for embeddings)

## 🚀 Getting Started

### Prerequisites
Make sure you have [Ollama](https://ollama.com/download) installed and running, then pull the required models:
```bash
ollama pull llama3.2
ollama pull nomic-embed-text
```

### 1. Start the Backend
The backend handles document ingestion and RAG querying.
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt # (Dependencies include fastapi, llama-index, chromadb, etc.)
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Start the Frontend
The frontend provides the beautiful glassmorphism chat interface.
```bash
cd frontend
npm install
npm run dev
```

### 3. Chat!
Open your browser to `http://localhost:5173`. Use the sidebar to enter an absolute path to a folder on your computer, click **Ingest**, and start chatting with your data once it finishes!

---
*Built with ❤️ (and entirely locally).*
