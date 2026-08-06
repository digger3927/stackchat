import sys
import os
import logging
logging.basicConfig(stream=sys.stdout, level=logging.DEBUG)
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from rag_engine import rag_engine

print("Loading project_1...")
rag_engine.load_project("project_1")
print(f"Has index: {rag_engine.index is not None}")

print("Chatting with query engine...")
query_engine = rag_engine.index.as_query_engine()
print(f"ChromaDB document count: {rag_engine.chroma_collection.count()}")
response = query_engine.query("hello")
print(f"Response: {response}")
print(f"Source nodes: {response.source_nodes}")
