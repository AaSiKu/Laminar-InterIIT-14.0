import pathway as pw
import queue
import threading
import logging
import os
import time
import litellm
from dotenv import load_dotenv
from pathway.xpacks.llm import parsers, splitters, embedders, llms
from pathway.xpacks.llm.document_store import DocumentStore
from pathway.stdlib.indexing import BruteForceKnnFactory
from rag.constant import UPLOADS_DIR
from utils.logging import configure_root, get_logger

# Load environment variables
load_dotenv()

configure_root()
logger = get_logger(__name__)

# Suppress verbose logging from external libraries
get_logger('LiteLLM').setLevel(logging.ERROR)
get_logger('litellm').setLevel(logging.ERROR)
get_logger('pathway_engine').setLevel(logging.WARNING)
get_logger('pathway_engine.connectors.monitoring').setLevel(logging.ERROR)
get_logger('httpx').setLevel(logging.WARNING)
get_logger('httpcore').setLevel(logging.WARNING)


# Validate API key
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    logger.error("❌ GOOGLE_API_KEY not found in environment variables!")
    raise ValueError("GOOGLE_API_KEY environment variable is required")

try:
    embedder = embedders.GeminiEmbedder(model="models/text-embedding-004")
    logger.info("✅ Embedder initialized")
except Exception as e:
    logger.error(f"❌ Failed to initialize embedder: {str(e)}")
    raise
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
    def stop(self):
        self._running = False

    def push(self, data: dict):
        self._data_queue.put(data)


class PathwayRAGSystem:
    def __init__(self, data_dir=UPLOADS_DIR, results_store=None):
        
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
        
        # Use OpenParser as fallback for better error handling
        # UnstructuredParser can crash on unsupported files
        try:
            parser = parsers.UnstructuredParser()
        except Exception as e:
            logger.warning(f"⚠️  UnstructuredParser failed, using OpenParser: {str(e)}")
            parser = parsers.OpenParser()
        
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
            """Extract text content from retrieved documents."""
            try:
                # Convert pw.Json to list
                if hasattr(docs, 'as_list'):
                    doc_list = docs.as_list()
                elif isinstance(docs, list):
                    doc_list = docs
                else:
                    return str(docs)
                
                context_pieces = []
                for doc in doc_list:
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
                
                return "\n\n---\n\n".join(context_pieces)
                
            except Exception as e:
                logger.error(f"❌ Error extracting context: {str(e)}")
                return ""
        
        queries_with_context = queries_with_docs.select(
            request_id=pw.this.request_id,
            query=pw.this.query,
            context=extract_context(pw.this.docs),
        )
        
        @pw.udf
        def generate_response_direct(context: str, query: str) -> str:
            """
            Generate response by calling LiteLLM directly with proper message format.
            Includes retry logic for rate limit errors.
            """
            try:
                
                # Suppress litellm verbose logging
                litellm.suppress_debug_info = True
                litellm.set_verbose = False
                
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
                
                # Get API key from environment
                api_key = os.getenv("GOOGLE_API_KEY")
                if not api_key:
                    logger.error("GOOGLE_API_KEY not set in environment")
                    return "Error: API key not configured"
                
                # Retry logic for rate limits
                max_retries = 3
                retry_delay = 2
                
                for attempt in range(max_retries):
                    try:
                        logger.info(f"🤖 Generating LLM response (attempt {attempt + 1}/{max_retries})...")
                        
                        response = litellm.completion(
                            model="gemini/gemini-2.0-flash",
                            messages=messages,
                            temperature=0.3,
                            max_tokens=250,
                            api_key=api_key
                        )
                        
                        logger.info(f"✅ LLM response generated successfully")
                        return response.choices[0].message.content
                        
                    except Exception as api_error:
                        error_str = str(api_error)
                        
                        # Extract just the error code and message
                        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                            error_type = "Rate limit exceeded"
                        elif "401" in error_str or "UNAUTHENTICATED" in error_str:
                            error_type = "Invalid API key"
                        elif "403" in error_str or "PERMISSION_DENIED" in error_str:
                            error_type = "Permission denied"
                        else:
                            error_type = "API error"
                        
                        if attempt < max_retries - 1:
                            wait_time = retry_delay * (2 ** attempt)
                            logger.warning(f"⚠️  {error_type} - Retrying in {wait_time}s...")
                            time.sleep(wait_time)
                            continue
                        else:
                            logger.error(f"❌ {error_type} after {max_retries} attempts")
                            return f"Error: {error_type}. Please try again later."
                
                return "Error: Failed to generate response after multiple attempts"
                
            except Exception as e:
                logger.error(f"❌ Unexpected error in LLM generation: {str(e)}")
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
        """Callback for retrieve pipeline results."""
        if is_addition:
            try:
                if hasattr(row, '_asdict'):
                    row_dict = row._asdict()
                elif isinstance(row, dict):
                    row_dict = row
                else:
                    row_dict = {'request_id': row[0], 'result': row[1]}
                
                request_id = row_dict.get('request_id')
                if request_id:
                    self.results_store[request_id] = row_dict
                    
            except Exception as e:
                logger.error(f"❌ Error in retrieve callback: {str(e)}")
    
    def _on_response_change(self, key, row, time, is_addition):
        """Callback for response pipeline results."""
        if is_addition:
            try:
                if hasattr(row, '_asdict'):
                    row_dict = row._asdict()
                elif isinstance(row, dict):
                    row_dict = row
                else:
                    row_dict = {'request_id': row[0], 'response': row[1]}

                request_id = row_dict.get('request_id')
                if request_id:
                    self.results_store[request_id] = row_dict
                    
            except Exception as e:
                logger.error(f"❌ Error in response callback: {str(e)}")

    # --- run_aside method ---
    def run_aside(self):
        """Start Pathway pipeline in a background thread."""
        logger.info("🚀 Starting Pathway pipeline...")
        
        def run_pathway():
            try:
                pw.run(
                    monitoring_level=pw.MonitoringLevel.NONE,
                )
            except Exception as e:
                logger.error(f"❌ Pathway pipeline error: {str(e)}")
        
        self.pathway_thread = threading.Thread(target=run_pathway, daemon=True)
        self.pathway_thread.start()
        logger.info("✅ Pathway pipeline running")
        return self.pathway_thread
    
    def stop(self):
        """Stop the Pathway pipeline (cleanup method)."""
        logger.info("Stopping Pathway pipeline...")
        if hasattr(self, 'retrieve_connector'):
            self.retrieve_connector.stop()
        if hasattr(self, 'response_connector'):
            self.response_connector.stop()
        logger.info("Pathway pipeline stopped")