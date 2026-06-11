import { describe, expect, it } from 'vitest';
import { parseSseStream } from '../shared/sse';

const encoder = new TextEncoder();

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<string[]> {
  const events: string[] = [];
  for await (const event of parseSseStream(stream)) {
    events.push(event);
  }
  return events;
}

describe('parseSseStream', () => {
  it('parses complete data events', async () => {
    await expect(collect(streamFromChunks(['data: {"a":1}\n\n', 'data: [DONE]\n\n']))).resolves.toEqual([
      '{"a":1}',
      '[DONE]',
    ]);
  });

  it('reassembles events split across chunks', async () => {
    await expect(
      collect(streamFromChunks(['data: {"choices":[{"delta"', ':{"content":"hel', 'lo"}}]}\n\n'])),
    ).resolves.toEqual(['{"choices":[{"delta":{"content":"hello"}}]}']);
  });

  it('ignores comments and event name lines', async () => {
    await expect(
      collect(
        streamFromChunks([
          ': keep-alive\n',
          'event: content_block_delta\n',
          'data: {"type":"content_block_delta"}\n\n',
        ]),
      ),
    ).resolves.toEqual(['{"type":"content_block_delta"}']);
  });

  it('joins multi-line data fields with newlines', async () => {
    await expect(collect(streamFromChunks(['data: first\n', 'data: second\n\n']))).resolves.toEqual([
      'first\nsecond',
    ]);
  });
});
