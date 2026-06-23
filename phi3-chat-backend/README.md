# Phi-3 Chat Backend (Node + Express + MySQL + Ollama SSE Streaming)

Local backend that talks to your Ollama-served Phi-3 model and streams the
reply back token-by-token (like Claude/ChatGPT typing), while saving full
chat history in MySQL.

## 1. Prerequisites

- Node.js 18+ (needed for native `fetch` + streaming)
- MySQL server running locally
- Ollama installed and running, with phi3 pulled:
  ```
  ollama pull phi3
  ollama serve
  ```

## 2. Setup

```bash
cd phi3-chat-backend
npm install
cp .env.example .env
```

Edit `.env` and set your real MySQL password / DB name etc.

## 3. Create the database

```bash
mysql -u root -p < db/schema.sql
```

This creates the `phi3_chat` database with `sessions` and `messages` tables.

## 4. Run the server

```bash
npm start
```

You should see:
```
🚀 Backend running on http://localhost:5000
📡 Talking to Ollama at http://localhost:11434
```

## 5. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/sessions` | Create a new chat session. Body: `{ "title": "My Chat" }` |
| GET | `/api/sessions` | List all sessions |
| GET | `/api/sessions/:sessionId/messages` | Get full message history for a session |
| DELETE | `/api/sessions/:sessionId` | Delete a session and its messages |
| POST | `/api/chat` | Send a message, get streamed SSE reply. Body: `{ "sessionId": 1, "message": "hi" }` |
| GET | `/api/health` | Health check |

## 6. How streaming works

`POST /api/chat` keeps the HTTP connection open and sends Server-Sent Events:

```
data: {"token": "Hello"}

data: {"token": " there"}

data: {"done": true}
```

Your frontend just needs to read this stream and append each `token` to the
chat bubble as it arrives — that's the "Claude-style" typing effect.

Example of consuming it from the frontend (vanilla fetch, works with React too):

```js
const res = await fetch('http://localhost:5000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId, message }),
});

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });

  const events = buffer.split('\n\n');
  buffer = events.pop();

  for (const event of events) {
    const json = JSON.parse(event.replace('data: ', ''));
    if (json.token) {
      // append json.token to the UI
    }
  }
}
```

## 7. Folder structure

```
phi3-chat-backend/
├── db/
│   └── schema.sql
├── src/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── chatController.js
│   │   └── sessionController.js
│   ├── routes/
│   │   ├── chatRoutes.js
│   │   └── sessionRoutes.js
│   ├── services/
│   │   └── ollamaService.js
│   ├── app.js
│   └── server.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 8. Next step

Once this is running, the React frontend will call `/api/sessions` to
create/list chats and `/api/chat` to send messages and render the streamed
reply.
