import requests
import json
from google import genai

# OpenRouter ModelBASE_URL = "https://openrouter.ai/api/v1/chat/completions"
# OpenRouter Model
MODEL = "google/gemini-2.0-flash-exp:free" 
# Google SDK Model
GOOGLE_MODEL = "gemini-3-flash-preview" 

def chat_with_bot():
    print("Welcome to ChatBuddy! (Type 'exit' to quit)")
    print(f"Using models: {MODEL} (OpenRouter) or {GOOGLE_MODEL} (Google)")
    
    # Prompt for API Key
    api_key = input("Please enter your API Key (OpenRouter or Google): ").strip()
    if not api_key:
        print("API Key is required to chat. Exiting.")
        return

    conversation_history = []
    
    while True:
        try:
            user_input = input("\nYou: ")
            if user_input.lower() in ['exit', 'quit']:
                print("Goodbye!")
                break
                
            conversation_history.append({"role": "user", "content": user_input})
            
            print("Bot is typing...", end="\r")

            if api_key and not api_key.startswith("sk-or-"):
                # Use Google GenAI SDK
                try:
                    client = genai.Client(api_key=api_key)
                    # Convert history to prompt string for simple one-shot usage, or use full history if preferred.
                    # Following app.py pattern of joining messages.
                    prompt_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation_history])
                    
                    response = client.models.generate_content(
                        model=GOOGLE_MODEL, 
                        contents=prompt_text
                    )
                    bot_reply = response.text
                    print(f"Bot: {bot_reply}")
                    conversation_history.append({"role": "assistant", "content": bot_reply})
                except Exception as e:
                    print(f"\nGoogle SDK Error: {e}")

            else:
                # Use OpenRouter via Requests
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://localhost:3000", # Required by OpenRouter for some free models
                    "X-Title": "Local Chatbot"
                }
                
                payload = {
                    "model": MODEL,
                    "messages": conversation_history
                }
                
                response = requests.post(BASE_URL, headers=headers, json=payload)
                
                if response.status_code == 200:
                    response_data = response.json()
                    bot_reply = response_data['choices'][0]['message']['content']
                    print(f"Bot: {bot_reply}")
                    conversation_history.append({"role": "assistant", "content": bot_reply})
                else:
                    print(f"\nError {response.status_code}: {response.text}")
                
        except KeyboardInterrupt:
            print("\nGoodbye!")
            break
        except Exception as e:
            print(f"\nAn error occurred: {e}")

if __name__ == "__main__":
    chat_with_bot()
