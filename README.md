# ChatBuddy (Chatbot)

ChatBuddy is a powerful and flexible chatbot application built with Flask, designed to provide intelligent responses using advanced AI models. It supports both Google's Gemini models (via the new Google GenAI SDK) and various models via OpenRouter.

## Features

-   **Dual Interface**:
    -   **Web UI**: A clean, responsive web interface built with Flask.
    -   **CLI Tool**: A terminal-based chat interface for quick interactions.
-   **Multi-Provider Support**:
    -   **Google Gemini**: Direct integration using the modern `google-genai` SDK (Default model: `gemini-3-flash-preview`).
    -   **OpenRouter**: Integration with OpenRouter API (Default model: `google/gemma-3-12b-it:free`).
-   **Smart Key Detection**: Automatically detects the provider based on your API Key format (e.g., keys starting with `sk-or-` switch to OpenRouter).
-   **Conversation History**: Maintains context throughout your chat session for more coherent responses.
-   **Key Validation**: Built-in endpoint to validate your API keys before starting a session.

## Prerequisites

-   Python 3.8 or higher
-   An API Key from either:
    -   [Google AI Studio](https://aistudio.google.com/) (for Gemini models)
    -   [OpenRouter](https://openrouter.ai/) (for OpenRouter models)

## Installation

1.  Clone the repository or download the source code.
2.  Navigate to the project directory:
    ```bash
    cd ChatBuddy
    ```
3.  Install the required dependencies:
    ```bash
    pip install -r requirements.txt
    ```

## Usage

### Running the Web Application (ChatBuddy Web)

1.  **Start the Server**:
    Run the Flask application:
    ```bash
    python app.py
    ```
    You should see output indicating the server is running on `http://127.0.0.1:5000`.

2.  **Access the UI**:
    Open your web browser and navigate to:
    ```
    http://localhost:5000
    ```

3.  **Authentication**:
    -   When you first load the page, you will be prompted to enter your API Key.
    -   **Google Gemini**: Enter your key starting with `AIza...`.
    -   **OpenRouter**: Enter your key starting with `sk-or-...`.
    -   Click **Start Chatting**. The app will validate your key.

4.  **Chatting**:
    -   Type your message in the input box and press Enter or click the send button.
    -   "ChatBuddy" will respond.
    -   The conversation history is preserved during the session.

5.  **Managing Keys**:
    -   Your API Key is stored locally in your browser for convenience.
    -   To change your key, click the **Change Key** button at the bottom of the chat interface.

### Running the CLI Tool (ChatBuddy CLI)

1.  **Start the Script**:
    Run the standalone chatbot script:
    ```bash
    python chatbot.py
    ```

2.  **Authentication**:
    -   The script will ask: `Please enter your API Key (OpenRouter or Google):`
    -   Paste your key and press Enter.

3.  **Chatting**:
    -   Type your message after the `You:` prompt.
    -   To exit the chat, type `exit` or `quit`.

## Project Structure

-   `app.py`: Main Flask application (Backend).
-   `chatbot.py`: Standalone CLI ChatBuddy.
-   `requirements.txt`: Python dependencies.
-   `templates/`: HTML templates.
-   `static/`: CSS and JavaScript files.

## Technologies Used

-   **Backend**: Python, Flask
-   **AI Integration**: `google-genai` SDK, `requests`
-   **Frontend**: HTML, CSS, JavaScript (Vanilla)

## License

This project is open-source and available for personal and educational use.
