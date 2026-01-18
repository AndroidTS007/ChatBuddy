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

    try {
        const response = await fetch('/validate_key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: key })
        });

        const data = await response.json();

        if (data.valid) {
            showValidation("Success! Key verified.", "success");
            localStorage.setItem('google_api_key', key);
            keyStatusText.textContent = "Key Saved & Verified";
            setTimeout(() => {
                hideModal();
                saveKeyBtn.disabled = false;
                saveKeyBtn.textContent = "Start Chatting";
            }, 1000);
        } else {
            showValidation(data.error || "Invalid API Key", "error");
            saveKeyBtn.disabled = false;
            saveKeyBtn.textContent = "Try Again";
        }
    } catch (error) {
        console.error("Validation Error:", error);
        showValidation("Error: " + error.message, "error");
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
    conversation.push({ role: 'user', content: message });

    // Show typing indicator
    showTypingIndicator();

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-API-Key': apiKey // Send the user's key
            },
            body: JSON.stringify({
                message: message,
                history: conversation.slice(-10) // Send last 10 messages for context
            })
        });

        const data = await response.json();
        removeTypingIndicator();

        if (response.ok) {
            appendMessage('bot', data.reply);
            conversation.push({ role: 'assistant', content: data.reply });
        } else {
            const errorMessage = data.error || 'Sorry, I encountered an error. Please try again.';
            appendMessage('bot', errorMessage);
            console.error(data.error);

            // If auth error, maybe prompt for key again
            if (response.status === 401 || response.status === 403) {
                appendMessage('bot', "It seems there's an issue with your API Key. Please update it.");
                setTimeout(showModal, 2000);
            }
        }

    } catch (error) {
        removeTypingIndicator();
        appendMessage('bot', 'Error: ' + error.message);
        console.error(error);
    }
}

function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(role === 'user' ? 'user-message' : 'bot-message');

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.innerText = text; // innerText avoids HTML injection

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
