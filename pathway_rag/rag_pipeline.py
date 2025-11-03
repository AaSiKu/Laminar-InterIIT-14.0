import os
import pathway as pw
import time
import uuid
import queue
import threading

from pathway.xpacks.llm import parsers, splitters, embedders, llms
from pathway.xpacks.llm import prompts
from pathway.xpacks.llm.document_store import DocumentStore
from pathway.stdlib.indexing import BruteForceKnnFactory

# --- Configuration ---
DATA_DIR = "./uploads"
embedder = embedders.GeminiEmbedder(model="models/text-embedding-004")

llm = llms.LiteLLMChat(
    model="gemini/models/gemini-1.5-pro-latest", 
    temperature=0.3, 
    max_tokens=250
)

# --- Pathway Schemas ---
class QueryInputSchema(pw.Schema):
    request_id: str
    query: str

class RetrieveInputSchema(pw.Schema):
    request_id: str
    query: str
    k: int

# --- PushableConnectorSubject Class ---

# this is a base class for creating custom data sources in pathway
# fastapi pushes data into this connector via the push() method
# then run() method runs it in pathway thread and chekcs the queue every 0.1 secs for new data

class PushableConnectorSubject(pw.io.python.ConnectorSubject):
    def __init__(self):
        super().__init__()
        self._data_queue = queue.Queue()
        self._running = True

    def run(self):
        while self._running:
            try:
                data = self._data_queue.get(timeout=0.1)
                if data:
                    self.next(**data)
            except queue.Empty:
                continue
    dt[]
    def stop(self):
        self._running = False

    def push(self, data: dict):
        self._data_queue.put(data)


class PathwayRAGSystem:
    def __init__(self, data_dir=DATA_DIR, results_store=None):
        
        # results_store is shared between pathway and fastapi for polling results
        self.results_store = results_store if results_store is not None else {}
        
        # --- Create input tables ---
        # response connector to get relevant chunks + llm response
        self.response_connector = PushableConnectorSubject()
        # retrieve connector to get relevant chunks only
        self.retrieve_connector = PushableConnectorSubject()

        self.response_input = pw.io.python.read(
            subject=self.response_connector,
            schema=QueryInputSchema,
            autocommit_duration_ms=50,
        )
        self.retrieve_input = pw.io.python.read(
            subject=self.retrieve_connector,
            schema=RetrieveInputSchema,
            autocommit_duration_ms=50,
        )

        # --- 1. Document Indexing ---
        documents = pw.io.fs.read(
            data_dir,
            mode="streaming", # streaming mode enabled, ie, ./upload is constantly monitored
            format="binary",
            with_metadata=True,
        )
        
        # bruteforceknn retriever to get relevant docs 
        # could take too much time when documents are large and numerous -> CONSIDER CHANGING LATER
        retriever_factory = BruteForceKnnFactory(
            embedder=embedder, # using gemini embeddor to convert text to embeddings
            dimensions=768, # gemini embedding dimension
        )
        
        parser = parsers.UnstructuredParser()
        # Increase chunk size for better context - 512 tokens ~= 2 paragraphs
        text_splitter = splitters.TokenCountSplitter(max_tokens=512)
        
        
        # document store pipeline:
        """
        - takes raw files from documents table
        - parses them with parser
        - splits text with splitter
        - embeds chunks with retriever_factory embedder
        - builds searchable index with retriever_factory
        - provides retrieve_query() method to get relevant docs for a query
        """
        self.document_store = DocumentStore(
            documents,
            retriever_factory=retriever_factory,
            parser=parser,
            splitter=text_splitter,
        )

        # --- 2. Retrieval Pipeline ---
        
        formatted_retrieve_queries = self.retrieve_input.select(
            query=pw.this.query,
            k=pw.this.k,
            metadata_filter=pw.cast(str | None, None),
            filepath_globpattern=pw.cast(str | None, None),
        )
        retrieve_results = self.document_store.retrieve_query(formatted_retrieve_queries)
        
        self.retrieve_output = self.retrieve_input.join(
            retrieve_results,
            self.retrieve_input.id == retrieve_results.id
        ).select(
            request_id=self.retrieve_input.request_id,
            result=retrieve_results.result,
        )

        # --- 3. RAG Pipeline ---
        formatted_response_queries = self.response_input.select(
            query=pw.this.query,
            k=3,
            metadata_filter=pw.cast(str | None, None),
            filepath_globpattern=pw.cast(str | None, None),
        )
        
        response_results = self.document_store.retrieve_query(formatted_response_queries)
        
        queries_with_docs = self.response_input.join(
            response_results,
            self.response_input.id == response_results.id
        ).select(
            request_id=self.response_input.request_id,
            query=self.response_input.query,
            docs=response_results.result,
        )
        
        @pw.udf # udf to extract context from retrieved docs
        def extract_context(docs: pw.Json) -> str:
            try:
                print(f"DEBUG extract_context: docs type={type(docs)}, docs={docs}")
                
                # Convert pw.Json to list
                if hasattr(docs, 'as_list'):
                    doc_list = docs.as_list()
                elif isinstance(docs, list):
                    doc_list = docs
                else:
                    print(f"DEBUG: docs is not list or pw.Json, converting to string")
                    return str(docs)
                
                print(f"DEBUG: doc_list has {len(doc_list)} items")
                
                context_pieces = []
                for i, doc in enumerate(doc_list):
                    print(f"DEBUG: doc[{i}] type={type(doc)}, doc={doc}")
                    
                    # Try different ways to extract text
                    text = None
                    if hasattr(doc, 'get'):
                        text = doc.get('text', doc.get('content', ''))
                    elif isinstance(doc, dict):
                        text = doc.get('text', doc.get('content', ''))
                    elif isinstance(doc, str):
                        text = doc
                    else:
                        text = str(doc)
                    
                    if text:
                        context_pieces.append(text)
                        print(f"DEBUG: Extracted text length: {len(text)}")
                
                result = "\n\n---\n\n".join(context_pieces)
                print(f"DEBUG: Final context length: {len(result)}")
                return result
                
            except Exception as e:
                print(f"Error in extract_context: {e}")
                import traceback
                traceback.print_exc()
                return ""
        
        queries_with_context = queries_with_docs.select(
            request_id=pw.this.request_id,
            query=pw.this.query,
            context=extract_context(pw.this.docs),
        )
        
        @pw.udf
        def generate_response_direct(context: str, query: str) -> str:
            """Generate response by calling LiteLLM directly with proper message format."""
            try:
                import litellm
                
                context_str = str(context) if context else ""
                query_str = str(query) if query else ""
                
                prompt_text = f"""You are a helpful assistant.
Use the following context to answer the user's query.
If the context does not contain the answer, state that you don't know.

Context:
{context_str}

Query:
{query_str}
"""
                
                messages = [{"role": "user", "content": prompt_text}]
                

                import os
                api_key = os.getenv("GOOGLE_API_KEY")
                
                response = litellm.completion(
                    model="gemini/gemini-2.0-flash",
                    messages=messages,
                    temperature=0.3,
                    max_tokens=250,
                    api_key=api_key
                )
                
                return response.choices[0].message.content
            except Exception as e:
                print(f"Error in generate_response_direct: {e}")
                import traceback
                traceback.print_exc()
                return f"Error generating response: {str(e)}"
        
        self.response_output = queries_with_context.select(
            request_id=pw.this.request_id,
            response=generate_response_direct(pw.this.context, pw.this.query)
        )
        
        # --- Callbacks ---
        pw.io.subscribe(
            self.retrieve_output,
            on_change=self._on_retrieve_change
        )
        
        pw.io.subscribe(
            self.response_output,
            on_change=self._on_response_change
        )
    
    # --- Callback methods ---
    def _on_retrieve_change(self, key, row, time, is_addition):
        if is_addition:
            try:
                if hasattr(row, '_asdict'):
                    row_dict = row._asdict()
                elif isinstance(row, dict):
                    row_dict = row
                else:
                    # Fallback for simple tuple
                    row_dict = {'request_id': row[0], 'result': row[1]}
                
                request_id = row_dict.get('request_id')
                if request_id:
                    self.results_store[request_id] = row_dict
            except Exception as e:
                print(f"Error in _on_retrieve_change: {e}, row type: {type(row)}, row: {row}")
    
    def _on_response_change(self, key, row, time, is_addition):
        if is_addition:
            try:
                if hasattr(row, '_asdict'):
                    row_dict = row._asdict()
                elif isinstance(row, dict):
                    row_dict = row
                else:
                    # Fallback for simple tuple
                    row_dict = {'request_id': row[0], 'response': row[1]}

                request_id = row_dict.get('request_id')
                if request_id:
                    self.results_store[request_id] = row_dict
                    print(f"DEBUG: Stored result for request_id {request_id}")
            except Exception as e:
                print(f"Error in _on_response_change: {e}, row type: {type(row)}, row: {row}")

    # --- run_aside method ---
    def run_aside(self):
        print("Starting Pathway pipeline in the background...")
        
        def run_pathway():
            try:
                pw.run(
                    monitoring_level=pw.MonitoringLevel.NONE,
                )
            except Exception as e:
                print(f"Error in Pathway pipeline: {e}")
                import traceback
                traceback.print_exc()
        
        self.pathway_thread = threading.Thread(target=run_pathway, daemon=True)
        self.pathway_thread.start()
        print("Pathway pipeline is running.")
        return self.pathway_thread
    
    def stop(self):
        if hasattr(self, 'retrieve_input_subject'):
            self.retrieve_input_subject.stop()
        if hasattr(self, 'response_input_subject'):
            self.response_input_subject.stop()