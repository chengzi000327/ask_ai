import { describe, expect, it, vi } from 'vitest';
import { AnthropicProvider } from '../providers/anthropic';
import { ProviderError, type Fetcher } from '../providers/provider';
import type { ChatMessage, ProviderConfig } from '../shared/types';

const encoder = new TextEncoder();

const config: ProviderConfig = {
  id: 'anthropic',
  name: 'Claude',
  kind: 'anthropic',
  baseUrl: 'https://api.anthropic.com/',
  apiKey: 'anthropic-key',
  models: ['claude-3-5-sonnet-latest'],
};

const messages: ChatMessage[] = [
  { role: 'system', content: 'Use the paper context.' },
  { role: 'user', content: 'Summarize it.' },
];

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

describe('AnthropicProvider', () => {
  it('posts messages request with Anthropic headers and promotes system messages', async () => {
    const fetcher = vi.fn<Fetcher>(async () =>
      sseResponse([
        'event: content_block_delta\n',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hel"}}\n\n',
        'event: content_block_delta\n',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"lo"}}\n\n',
      ]),
    );
    const deltas: string[] = [];

    const full = await new AnthropicProvider(fetcher).chat({
      config,
      model: 'claude-3-5-sonnet-latest',
      messages,
      onDelta: (text) => deltas.push(text),
    });

    expect(full).toBe('Hello');
    expect(deltas).toEqual(['Hel', 'lo']);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      'x-api-key': 'anthropic-key',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(init?.body as string)).toMatchObject({
      model: 'claude-3-5-sonnet-latest',
      system: 'Use the paper context.',
      stream: true,
      messages: [{ role: 'user', content: 'Summarize it.' }],
    });
  });

  it('throws ProviderError with HTTP status on non-2xx responses', async () => {
    const fetcher = vi.fn<Fetcher>(async () => new Response('bad key', { status: 401 }));

    await expect(
      new AnthropicProvider(fetcher).chat({
        config,
        model: 'claude-3-5-sonnet-latest',
        messages,
        onDelta: () => undefined,
      }),
    ).rejects.toBeInstanceOf(ProviderError);
    await expect(
      new AnthropicProvider(fetcher).chat({
        config,
        model: 'claude-3-5-sonnet-latest',
        messages,
        onDelta: () => undefined,
      }),
    ).rejects.toMatchObject({ status: 401 });
  });
});
