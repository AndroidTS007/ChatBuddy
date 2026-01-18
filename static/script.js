const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// API Key Elements
const apiKeyModal = document.getElementById('api-key-modal');
const apiKeyInput = document.getElementById('api-key-input');
const saveKeyBtn = document.getElementById('save-key-btn');
const keyStatusText = document.getElementById('key-status-text');
const validationMsg = document.getElementById('validation-msg');

let conversation = [];

// Check for API Key on Load
document.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('google_api_key');
    if (!savedKey) {
        showModal();
    } else {
        keyStatusText.textContent = "Using Saved API Key";
        // Simple heuristic validation on load to ensure UI state is correct
        if (savedKey.startsWith("sk-or-")) {
            console.log("Detected OpenRouter Key");
        } else if (savedKey.startsWith("AIza")) {
            console.log("Detected Google Gemini Key");
        }
    }
});

function showModal() {
    apiKeyModal.classList.add('show');
    apiKeyInput.value = '';
    validationMsg.textContent = '';
    validationMsg.className = 'validation-message';
}

function hideModal() {
    apiKeyModal.classList.remove('show');
}

async function validateApiKey(key) {
    if (key.startsWith("sk-or-")) {
        // Validation for OpenRouter
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${key}`,
                    "Content-Type": "application/json",
                    // Required for some free models on OpenRouter
                    "HTTP-Referer": window.location.href,
                    "X-Title": "ChatBuddy"
                },
                body: JSON.stringify({
                    model: "google/gemma-2-9b-it:free", // Use a lightweight/free model for check
                    messages: [{ role: "user", content: "Test" }]
                })
            });
            // 401/403 usually means bad key. 200 is good. 402 is insufficient credits but key is valid-ish.
            if (response.ok) return { valid: true };
            const err = await response.json();
            return { valid: false, error: err.error?.message || "Invalid OpenRouter Key" };
        } catch (e) {
            return { valid: false, error: "Network Error: " + e.message };
        }
    } else {
        // Validation for Google Gemini
        // We use the REST API directly: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY
        // Note: 'gemini-3-flash-preview' might allow different endpoints, but let's stick to standard 1.5-flash for broader validation or 2.0-flash-exp
        const model = "gemini-2.0-flash-exp";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Test" }] }]
                })
            });

            const data = await response.json();
            if (response.ok && !data.error) return { valid: true };
            return { valid: false, error: data.error?.message || "Invalid Gemini Key" };
        } catch (e) {
            return { valid: false, error: "Network Error: " + e.message };
        }
    }
}

saveKeyBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
        showValidation("Please enter an API Key", "error");
        return;
    }

    // UI Loading State
    saveKeyBtn.disabled = true;
    saveKeyBtn.textContent = "Validating...";
    showValidation("Checking key...", "");

    const result = await validateApiKey(key);

    if (result.valid) {
        showValidation("Success! Key verified.", "success");
        localStorage.setItem('google_api_key', key);
        keyStatusText.textContent = "Key Saved & Verified";
        setTimeout(() => {
            hideModal();
            saveKeyBtn.disabled = false;
            saveKeyBtn.textContent = "Start Chatting";
        }, 1000);
    } else {
        showValidation(result.error || "Invalid API Key", "error");
        saveKeyBtn.disabled = false;
        saveKeyBtn.textContent = "Try Again";
    }
});

function showValidation(msg, type) {
    validationMsg.textContent = msg;
    validationMsg.className = 'validation-message ' + type;
}

// Allow Enter key in modal input
apiKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        saveKeyBtn.click();
    }
});

// Global function to clear key
window.clearApiKey = function () {
    localStorage.removeItem('google_api_key');
    location.reload();
};

// Auto-resize textarea
userInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Send on Enter (but require Shift+Enter for new line)
userInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendBtn.addEventListener('click', sendMessage);

async function getChatResponse(message, history, apiKey) {
    if (apiKey.startsWith("sk-or-")) {
        // OpenRouter Logic
        const url = "https://openrouter.ai/api/v1/chat/completions";
        const messages = history.map(msg => ({
            role: msg.role === 'bot' ? 'assistant' : msg.role, // normalize 'bot' to 'assistant'
            content: msg.message || msg.content
        }));
        messages.push({ role: "user", content: message });

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": window.location.href,
                "X-Title": "ChatBuddy"
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-exp:free", // Default to a free model for general use
                messages: messages
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "OpenRouter API Error");
        }
        const data = await response.json();
        return data.choices[0].message.content;

    } else {
        // Google Gemini Direct REST API Logic
        const model = "gemini-2.0-flash-exp";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Convert history to Gemini format: { role: "user"|"model", parts: [{ text: "..." }] }
        // Note: Gemini API is strict about turn order (user, model, user, model).
        const contents = [];
        history.forEach(msg => {
            const role = (msg.role === 'user') ? 'user' : 'model';
            // Simple validation to ensure alternating roles if strictly required, 
            // but for now we just map. If history is messy, API might error.
            contents.push({ role: role, parts: [{ text: msg.content || msg.message }] });
        });
        contents.push({ role: "user", parts: [{ text: message }] });

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: contents })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Gemini API Error");
        }
        const data = await response.json();
        // Extract text from response
        // candidates[0].content.parts[0].text
        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error("Unexpected response format from Gemini");
        }
    }
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // Check if we have a key before sending
    const apiKey = localStorage.getItem('google_api_key');
    if (!apiKey) {
        showModal();
        return;
    }

    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';

    // Add user message to UI
    appendMessage('user', message);

    // Show typing indicator
    showTypingIndicator();

    try {
        const reply = await getChatResponse(message, conversation, apiKey);

        removeTypingIndicator();
        appendMessage('bot', reply);

        // Update history
        conversation.push({ role: 'user', content: message });
        conversation.push({ role: 'assistant', content: reply });

    } catch (error) {
        removeTypingIndicator();
        console.error(error);
        appendMessage('bot', 'Error: ' + error.message);

        if (error.message.includes("key") || error.message.includes("401") || error.message.includes("403")) {
            // Basic check if it looks like an auth error
            setTimeout(() => {
                showValidation("Auth Error: " + error.message, "error");
                showModal();
            }, 2000);
        }
    }
}

function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(role === 'user' ? 'user-message' : 'bot-message');

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');

    // Parse markdown-like ticks? For now, just text. 
    // If you want markdown support, we'd need a library like marked.js
    // For safety, we use innerText for user, and maybe allow simple formatting for bot?
    // Let's stick to textContent for safety unless we import a sanitizer.
    contentDiv.textContent = text;

    // Simple improvement: Convert newlines to <br> for better display
    contentDiv.innerHTML = text.replace(/\n/g, '<br>');

    const timeDiv = document.createElement('div');
    timeDiv.classList.add('message-time');
    const now = new Date();
    timeDiv.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    msgDiv.appendChild(contentDiv);
    msgDiv.appendChild(timeDiv);

    chatHistory.appendChild(msgDiv);
    scrollToBottom();
}

function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'typing-indicator';
    indicator.classList.add('typing-indicator');
    indicator.innerHTML = `
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
    `;
    chatHistory.appendChild(indicator);
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function scrollToBottom() {
    chatHistory.scrollTop = chatHistory.scrollHeight;
}
