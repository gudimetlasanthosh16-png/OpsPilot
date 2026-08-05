import os
import glob
import chromadb
from chromadb.utils import embedding_functions

# Initialize ChromaDB client (in-memory for now)
client = chromadb.Client()

# Use default embedding function (all-MiniLM-L6-v2)
default_ef = embedding_functions.DefaultEmbeddingFunction()

# Create a collection
collection = client.get_or_create_collection(name="opspilot_knowledge", embedding_function=default_ef)

def ingest_documents():
    """Reads markdown files from data/knowledge and ingests them into ChromaDB."""
    knowledge_dir = os.path.join(os.path.dirname(__file__), "..", "data", "knowledge")
    
    if not os.path.exists(knowledge_dir):
        print(f"Warning: Knowledge directory {knowledge_dir} not found.")
        return

    docs = []
    metadatas = []
    ids = []
    
    for filepath in glob.glob(os.path.join(knowledge_dir, "*.md")):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Simple chunking by paragraph (for demonstration)
            paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
            
            for i, para in enumerate(paragraphs):
                docs.append(para)
                filename = os.path.basename(filepath)
                metadatas.append({"source": filename, "chunk": i})
                ids.append(f"{filename}_{i}")
                
    if docs:
        collection.add(
            documents=docs,
            metadatas=metadatas,
            ids=ids
        )
        print(f"Ingested {len(docs)} chunks into the knowledge base.")

# Auto-ingest on module load
ingest_documents()

def search_knowledge_base(query: str, n_results: int = 3) -> str:
    """
    Search the internal knowledge base (runbooks, architecture docs) for the given query.
    """
    if collection.count() == 0:
        return "The knowledge base is empty. No documents available to search."
        
    try:
        results = collection.query(
            query_texts=[query],
            n_results=n_results
        )
        
        if not results['documents'] or not results['documents'][0]:
            return "No relevant documents found for the query."
            
        formatted_results = []
        for i in range(len(results['documents'][0])):
            doc = results['documents'][0][i]
            meta = results['metadatas'][0][i]
            formatted_results.append(f"--- Document Source: {meta['source']} ---\n{doc}")
            
        return "\n\n".join(formatted_results)
    except Exception as e:
        return f"Error searching knowledge base: {str(e)}"
