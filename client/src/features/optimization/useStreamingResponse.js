/**
 * useStreamingResponse â€” consume SSE from POST /analyze-code/stream.
 *
 * EventSource only supports GET, so we use fetch + ReadableStream parsing.
 * Exposes live text, provider info, tokens/sec, and extracted code from
 * partial markdown as it streams in.
 */
import { useCallback, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001';

/** Extract last complete or partial fenced code block from streaming markdown. */
export function extractStreamingCode(text) {
  if (!text) return '';
  // Complete blocks first
  const complete = [...text.matchAll(/```[a-zA-Z0-9_+-]*\n([\s\S]*?)```/g)];
  if (complete.length > 0) return complete[complete.length - 1][1].trim();
  // Partial block still streaming (opening fence, no closing yet)
  const partial = text.match(/```[a-zA-Z0-9_+-]*\n([\s\S]*)$/);
  if (partial) return partial[1];
  return '';
}

export default function useStreamingResponse() {
  const [streamText, setStreamText] = useState('');
  const [streamCode, setStreamCode] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamProvider, setStreamProvider] = useState(null);
  const [streamStats, setStreamStats] = useState(null); // {tokensIn, tokensOut, tokensPerSec, fromCache}
  const [streamError, setStreamError] = useState(null);
  const abortRef = useRef(null);

  const stopStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(async ({ code, language, task, provider, userInstructions, optimizationFocus, onDone }) => {
    stopStream();
    const controller = new AbortController();
    abortRef.current = controller;

    setStreamText('');
    setStreamCode('');
    setStreamError(null);
    setStreamStats(null);
    setStreamProvider(null);
    setIsStreaming(true);

    const startedAt = performance.now();
    let fullText = '';
    let chunkCount = 0;

    try {
      const response = await fetch(`${API_BASE}/analyze-code/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          code,
          language,
          task,
          provider: provider === 'auto' ? null : provider,
          user_instructions: userInstructions || null,
          optimization_focus: optimizationFocus || null,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error('Streaming not supported by browser');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse complete SSE frames from buffer
        const frames = buffer.split('\n\n');
        buffer = frames.pop(); // keep incomplete frame

        for (const frame of frames) {
          const line = frame.trim();
          if (!line.startsWith('data: ')) continue;
          let event;
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (event.type === 'start') {
            setStreamProvider(event.provider);
            if (event.cached) {
              setStreamStats((s) => ({ ...s, fromCache: true }));
            }
            // Fallback restart: clear text accumulated from failed provider
            fullText = '';
            setStreamText('');
            setStreamCode('');
          } else if (event.type === 'chunk') {
            fullText += event.text;
            chunkCount += 1;
            setStreamText(fullText);
            setStreamCode(extractStreamingCode(fullText));
          } else if (event.type === 'done') {
            const elapsedSec = (performance.now() - startedAt) / 1000;
            const stats = {
              tokensOut: event.tokens_out || 0,
              tokensPerSec: elapsedSec > 0 ? Math.round((event.tokens_out || 0) / elapsedSec) : 0,
              elapsedSec: Math.round(elapsedSec * 10) / 10,
              chunks: chunkCount,
              fromCache: !!event.from_cache,
            };
            setStreamStats(stats);
            if (onDone) onDone({ fullText, optimizedCode: event.optimized_code || extractStreamingCode(fullText), stats });
          } else if (event.type === 'error') {
            setStreamError(event.detail || 'Stream error');
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setStreamError(err.message || 'Stream failed');
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }

    return fullText;
  }, [stopStream]);

  return {
    streamText,
    streamCode,
    isStreaming,
    streamProvider,
    streamStats,
    streamError,
    startStream,
    stopStream,
  };
}

