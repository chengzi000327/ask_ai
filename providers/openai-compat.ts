import { parseSseStream } from '../shared/sse';
import type { ChatOptions, Provider } from '../shared/types';
import type { Fetcher } from './provider';
import { ProviderError } from './provider';

export class OpenAICompatProvider implements Provider {
  constructor(private readonly fetcher: Fetcher = fetch) {}

  async chat(opts: ChatOptions): Promise<string> {
    const init: RequestInit = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        stream: true,
      }),
    };
    if (opts.signal) {
      init.signal = opts.signal;
    }

    const response = await this.fetcher(
      `${trimTrailingSlash(opts.config.baseUrl)}/chat/completions`,
      init,
    );

    if (!response.ok) {
      throw new ProviderError(await errorMessage(response), response.status);
    }
    if (!response.body) {
      throw new ProviderError('Provider response did not include a stream.', response.status);
    }

    let full = '';
    for await (const event of parseSseStream(response.body)) {
      if (event === '[DONE]') {
        break;
      }

      const delta = readDelta(event);
      if (delta.length > 0) {
        full += delta;
        opts.onDelta(delta);
      }
    }

    return full;
  }
}

function readDelta(event: string): string {
  const parsed = JSON.parse(event) as {
    choices?: Array<{ delta?: { content?: string } }>;
  };
  return parsed.choices?.[0]?.delta?.content ?? '';
}

async function errorMessage(response: Response): Promise<string> {
  const text = await response.text();
  return text || `Provider request failed with status ${response.status}`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}
