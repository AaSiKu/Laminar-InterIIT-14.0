# Add this to your ~/.zshrc or source it from another file
post_prompt() {
  if [ -z "$1" ]; then
    echo "Usage: post_prompt \"your prompt text\"" >&2
    return 1
  fi
  
  curl -s -X POST http://localhost:8000/prompt \
    -H "Content-Type: application/json" \
    -d "{\"prompt\": \"$1\"}"
}
