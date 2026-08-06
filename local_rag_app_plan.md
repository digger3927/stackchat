## Goal Description
Build a local, privacy-first Retrieval-Augmented Generation (RAG) web application. The application will allow the user to select local folders containing various document types (PDF, EPUB, TXT, MD, HTML) and ingest them into a local vector database. The user can then chat with a lightweight local LLM (via Ollama) to ask questions, explore deep dives, and make connections based strictly on the ingested documents. The application will be designed with a premium, responsive web interface.

## Proposed Architecture & Tech Stack
To achieve this securely and efficiently, I propose the following stack:

*   **LLM Provider:** **Ollama**. Excellent choice for cross-platform local execution.
*   **Backend Framework:** **Python with FastAPI**. FastAPI is incredibly fast, handles asynchronous operations beautifully (crucial for streaming LLM responses), and is the industry standard for modern Python APIs.
*   **RAG Engine:** **LlamaIndex**. While LangChain is popular, LlamaIndex is purpose-built specifically for connecting local data to LLMs and handles complex document ingestion (like PDFs and EPUBs) with less boilerplate.
*   **Vector Database:** **ChromaDB**. It runs entirely locally, saves its data to a simple folder in your project, and is perfectly cross-platform with no separate server installation required.
*   **Embedding Model:** `nomic-embed-text` (running via Ollama). This keeps the embedding process 100% local, avoiding any data leaving your machine.
*   **Frontend UI:** **React (via Vite)**. We'll build a robust single-page application and style it entirely with **Vanilla CSS** to achieve a stunning, modern, and highly customized aesthetic (glassmorphism, smooth animations, dark mode).

> [!IMPORTANT]
> **User Review Required - Architecture:** Please review the proposed technology stack above. Let me know if you are comfortable with this combination of Python/FastAPI for the backend and React for the frontend.

## Open Questions

> [!TIP]
> **Design Preferences:** Since a premium look is a priority, do you have any specific aesthetic preferences? (e.g., A sleek dark mode, specific accent colors, or inspiration from apps you currently like?)

## Proposed Implementation Steps

---

### Phase 1: Backend Foundation (Python)
We will set up the API and the core RAG logic.

#### [NEW] `backend/requirements.txt`
Dependencies including `fastapi`, `uvicorn`, `llama-index`, `chromadb`, `llama-index-llms-ollama`, `llama-index-embeddings-ollama`, and document parsers.

#### [NEW] `backend/main.py`
The FastAPI application entry point with CORS configured to allow the frontend to communicate.

#### [NEW] `backend/rag_engine.py`
The core logic containing:
1.  **Ingestion Function:** Scans a given local folder path, detects file types, extracts text using specialized LlamaIndex readers (for PDF, EPUB, etc.), chunks the text, and generates embeddings via Ollama.
2.  **Query Engine:** Connects the ChromaDB vector store to the Ollama chat model to retrieve relevant context and generate answers.

---

### Phase 2: Frontend Foundation (React)
We will scaffold the user interface.

#### [NEW] `frontend/` (Vite App)
Initialize a new React project using Vite.

#### [NEW] `frontend/src/index.css`
Establish a robust CSS design system featuring custom properties for colors, typography, glassmorphism effects, and micro-animations.

---

### Phase 3: Application Assembly
Connecting the frontend to the backend.

#### [NEW] `frontend/src/App.jsx`
Main layout featuring a sidebar for configuration/folder selection and a main chat area.

#### [NEW] Components
*   `ChatInterface.jsx`: Handles displaying messages and the input area with streaming text support.
*   `FolderIngestion.jsx`: A UI to input a local folder path, trigger ingestion, and show a loading state/progress bar.

## Verification Plan

### Automated/Local Testing
1.  Verify the FastAPI server starts and endpoints are accessible.
2.  Verify the Vite development server runs without errors.
3.  Ensure Ollama is running locally with the required models (`ollama run llama3` and `ollama pull nomic-embed-text`).

### Manual Verification
1.  **Ingestion:** Provide a path to a test folder containing a PDF and an EPUB. Verify the UI reflects successful ingestion and the local ChromaDB folder is populated.
2.  **Retrieval:** Ask a highly specific question that can only be answered by the test documents.
3.  **Aesthetics:** Verify the UI looks premium, animations are smooth, and the layout is responsive.
