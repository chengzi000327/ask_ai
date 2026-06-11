import { describe, expect, it, vi } from 'vitest';
import { OpenAICompatProvider } from '../providers/openai-compat';
import { ProviderError, type Fetcher } from '../providers/provider';
import type { ChatMessage, ProviderConfig } from '../shared/types';

const encoder = new TextEncoder();

const config: ProviderConfig = {
  id: 'deepseek',
  name: 'DeepSeek',
  kind: 'openai-compat',
  baseUrl: 'https://api.deepseek.com/v1/',
  apiKey: 'test-key',
  models: ['deepseek-chat'],
};

const messages: ChatMessage[] = [{ role: 'user', content: 'hello' }];

function sseResponse(chunks: string[]): Response {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    }),
    { status: 200 },
  );
}

describe('OpenAICompatProvider', () => {
  it('posts a streaming chat completion request and concatenates delta content', async () => {
    const fetcher = vi.fn<Fetcher>(async () =>
      sseResponse([
        'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const deltas: string[] = [];

    const full = await new OpenAICompatProvider(fetcher).chat({
      config,
      model: 'deepseek-chat',
      messages,
      onDelta: (text) => deltas.push(text),
    });

    expect(full).toBe('Hello');
    expect(deltas).toEqual(['Hel', 'lo']);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.deepseek.com/v1/chat/completions');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(init?.body as string)).toEqual({
      model: 'deepseek-chat',
      messages,
      stream: true,
    });
  });

  it('throws ProviderError with HTTP status for auth failures', async () => {
    const fetcher = vi.fn<Fetcher>(async () => new Response('invalid key', { status: 401 }));

    await expect(
      new OpenAICompatProvider(fetcher).chat({
        config,
        model: 'deepseek-chat',
        messages,
        onDelta: () => undefined,
      }),
    ).rejects.toMatchObject({
      status: 401,
    });
    await expect(
      new OpenAICompatProvider(fetcher).chat({
        config,
        model: 'deepseek-chat',
        messages,
        onDelta: () => undefined,
      }),
    ).rejects.toBeInstanceOf(ProviderError);
  });
});
