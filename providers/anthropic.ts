import { parseSseStream } from '../shared/sse';
import type { ChatMessage, ChatOptions, Provider } from '../shared/types';
import type { Fetcher } from './provider';
import { ProviderError } from './provider';

export class AnthropicProvider implements Provider {
  constructor(private readonly fetcher: Fetcher = fetch) {}

  async chat(opts: ChatOptions): Promise<string> {
    const { system, messages } = splitSystemMessages(opts.messages);
    const init: RequestInit = {
      method: 'POST',
      headers: {
        'x-api-key': opts.config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: 4096,
        stream: true,
        ...(system ? { system } : {}),
        messages,
      }),
    };
    if (opts.signal) {
      init.signal = opts.signal;
    }

    const response = await this.fetcher(`${trimTrailingSlash(opts.config.baseUrl)}/v1/messages`, init);
    if (!response.ok) {
      throw new ProviderError(await errorMessage(response), response.status);
    }
    if (!response.body) {
      throw new ProviderError('Provider response did not include a stream.', response.status);
    }

    let full = '';
    for await (const event of parseSseStream(response.body)) {
      const delta = readDelta(event);
      if (delta.length > 0) {
        full += delta;
        opts.onDelta(delta);
      }
    }

    return full;
  }
}

function splitSystemMessages(messages: ChatMessage[]): {
  system: string;
  messages: Array<Exclude<ChatMessage, { role: 'system' }>>;
} {
  const system = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');
  const nonSystem = messages.filter((message) => message.role !== 'system') as Array<
    Exclude<ChatMessage, { role: 'system' }>
  >;
  return { system, messages: nonSystem };
}

function readDelta(event: string): string {
  const parsed = JSON.parse(event) as {
    type?: string;
    delta?: {
      type?: string;
      text?: string;
    };
  };
  if (parsed.type !== 'content_block_delta' || parsed.delta?.type !== 'text_delta') {
    return '';
  }
  return parsed.delta.text ?? '';
}

async function errorMessage(response: Response): Promise<string> {
  const text = await response.text();
  return text || `Provider request failed with status ${response.status}`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}
