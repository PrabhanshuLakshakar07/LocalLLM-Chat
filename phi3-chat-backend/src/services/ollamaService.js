import dotenv from 'dotenv';
dotenv.config();

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'phi3';

/**
 * Streams a chat response from Ollama and calls onToken(token) for every
 * piece of text as it arrives. Returns the full accumulated reply at the end.
 *
 * @param {{role: string, content: string}[]} messages - conversation history
 * @param {(token: string) => void} onToken - callback fired per streamed token
 * @returns {Promise<string>} full assistant reply
 */
export async function streamOllamaChat(messages, onToken) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // last (possibly incomplete) line stays in buffer

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const json = JSON.parse(line);
        const token = json?.message?.content || '';

        if (token) {
          fullText += token;
          onToken(token);
        }

        if (json.done) {
          return fullText;
        }
      } catch (err) {
        console.error('Failed to parse Ollama chunk:', line, err.message);
      }
    }
  }

  return fullText;
}
