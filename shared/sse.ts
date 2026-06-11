const decoder = new TextDecoder();

export async function* parseSseStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = stream.getReader();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      yield* drainEvents(buffer, (remaining) => {
        buffer = remaining;
      });
    }

    buffer += decoder.decode();
    if (buffer.trim().length > 0) {
      const event = parseEvent(buffer);
      if (event !== null) {
        yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function* drainEvents(
  buffer: string,
  setRemaining: (remaining: string) => void,
): Generator<string> {
  let cursor = 0;

  while (true) {
    const nextUnix = buffer.indexOf('\n\n', cursor);
    const nextWindows = buffer.indexOf('\r\n\r\n', cursor);
    const next = minFound(nextUnix, nextWindows);

    if (next === -1) {
      setRemaining(buffer.slice(cursor));
      return;
    }

    const separatorLength = next === nextWindows ? 4 : 2;
    const rawEvent = buffer.slice(cursor, next);
    const event = parseEvent(rawEvent);
    if (event !== null) {
      yield event;
    }
    cursor = next + separatorLength;
  }
}

function parseEvent(rawEvent: string): string | null {
  const dataLines: string[] = [];

  for (const line of rawEvent.split(/\r?\n/)) {
    if (line.startsWith(':') || line.length === 0) {
      continue;
    }

    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    if (field !== 'data') {
      continue;
    }

    const rawValue = separator === -1 ? '' : line.slice(separator + 1);
    dataLines.push(rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue);
  }

  return dataLines.length > 0 ? dataLines.join('\n') : null;
}

function minFound(left: number, right: number): number {
  if (left === -1) {
    return right;
  }
  if (right === -1) {
    return left;
  }
  return Math.min(left, right);
}
