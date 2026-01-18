from flask import Flask, render_template, request, jsonify
import requests
from google import genai

app = Flask(__name__)

def get_chat_response_dynamic(messages, provider):
    """Handle chat request for a specific dynamic provider config"""
    print(f"Attempting User Key Provider: {provider['name']}...")
    
    api_key = provider.get('key_value')
    if not api_key:
        return None, ["No API Key provided"]

    # Google New SDK Handler
    if provider['type'] == 'google_new_sdk':
        try:
            client = genai.Client(api_key=api_key)
            # Create prompt string from messages
            prompt_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
            
            response = client.models.generate_content(
                model=provider['model'], 
                contents=prompt_text
            )
            return response.text, None
        except Exception as e:
            error_msg = f"Google SDK Error: {str(e)}"
            print(error_msg)
            return None, [error_msg]

            return None, [error_msg]

    headers = {"Content-Type": "application/json"}
    headers.update(provider["headers_extra"])
    
    if provider['type'] == 'openai':
        headers['Authorization'] = f"Bearer {api_key}"
        payload = {
            "model": provider["model"],
            "messages": messages
        }
        url = provider['url']
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            if response.status_code == 200:
                data = response.json()
                content = data['choices'][0]['message']['content']
                return content, None
            else:
                return None, [f"Provider failed: {response.text}"]
        except Exception as e:
            return None, [str(e)]
    
    return None, ["Unknown provider type"]

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message')
        history = data.get('history', [])

        if not user_message:
            return jsonify({"error": "No message provided"}), 400

        # Prepare messages
        messages = [{"role": msg['role'], "content": msg['content']} for msg in history]
        messages.append({"role": "user", "content": user_message})

        # Get User Provided Key from Header
        user_api_key = request.headers.get('X-User-API-Key')
        
        # Determine which key/provider to use
        if user_api_key:
             # Check if it's an OpenRouter Key
             if user_api_key.startswith("sk-or-"):
                 dynamic_provider = {
                    "name": "OpenRouter (Your Key)",
                    "type": "openai", # OpenRouter uses OpenAI format
                    "url": "https://openrouter.ai/api/v1/chat/completions",
                    "model": "google/gemma-3-12b-it:free",
                    "key_value": user_api_key,
                    "headers_extra": {"HTTP-Referer": "http://localhost:5000", "X-Title": "ChatBuddy"}
                 }
             else:
                 # Assume Google Gemini Key (New SDK)
                 dynamic_provider = {
                    "name": "Google Gemini (New SDK)",
                    "type": "google_new_sdk",
                    "url": "", # Handled by SDK
                    "model": "gemini-3-flash-preview", # As verified working
                    "key_value": user_api_key,
                    "headers_extra": {}
                 }
             bot_reply, errors = get_chat_response_dynamic(messages, dynamic_provider)
        else:
             # No Key Provided
             return jsonify({"error": "No API Key provided. Please set your key in the settings."}), 400
        
        if bot_reply:
            return jsonify({"reply": bot_reply})
        else:
            return jsonify({"error": "All providers failed. " + "; ".join(errors)}), 503

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/validate_key', methods=['POST'])
def validate_key():
    try:
        data = request.json
        api_key = data.get('api_key')
        
        if not api_key:
            return jsonify({"valid": False, "error": "No key provided"}), 400

        # Determine Validation Target based on Key Prefix
        if api_key.startswith("sk-or-"):
            # Validate against OpenRouter
            url = "https://openrouter.ai/api/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            # Use a free model for validation check
            payload = {
                "model": "google/gemma-3-12b-it:free",
                "messages": [{"role": "user", "content": "Test"}]
            }
            try:
                r = requests.post(url, headers=headers, json=payload, timeout=10)
                if r.status_code == 200:
                    return jsonify({"valid": True})
                else:
                    return jsonify({"valid": False, "error": "Invalid OpenRouter API Key"}), 400
            except Exception:
                return jsonify({"valid": False, "error": "Failed to connect to OpenRouter"}), 500
        else:
            # Validate against Google (New SDK)
            try:
                client = genai.Client(api_key=api_key)
                response = client.models.generate_content(
                    model="gemini-3-flash-preview", 
                    contents="Test"
                )
                return jsonify({"valid": True})
            except Exception as e:
                error_str = str(e)
                # Check for common invalid key indicators
                if "API_KEY_INVALID" in error_str or "API key not valid" in error_str:
                    return jsonify({"valid": False, "error": "The Google API Key is invalid."}), 400
                return jsonify({"valid": False, "error": f"Validation failed: {error_str}"}), 400
            
    except Exception as e:
        return jsonify({"valid": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
