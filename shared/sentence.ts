const SENTENCE_END_RE = /[.!?。！？]/;

export function expandToSentence(lines: string[], lineIndex: number): string {
  if (lineIndex < 0 || lineIndex >= lines.length) {
    return '';
  }

  const before = collectBefore(lines, lineIndex);
  const target = normalizeLine(lines[lineIndex] ?? '');
  const after = collectAfter(lines, lineIndex);
  const joined = joinWrappedLines([...before, target, ...after]);

  return trimToSentence(joined, lengthOfJoined(before));
}

function collectBefore(lines: string[], lineIndex: number): string[] {
  const collected: string[] = [];
  for (let index = lineIndex - 1; index >= 0; index -= 1) {
    const line = normalizeLine(lines[index] ?? '');
    if (line.length === 0) {
      break;
    }
    collected.unshift(line);
    if (hasSentenceEnd(line)) {
      break;
    }
  }
  return collected;
}

function collectAfter(lines: string[], lineIndex: number): string[] {
  const collected: string[] = [];
  for (let index = lineIndex + 1; index < lines.length; index += 1) {
    const line = normalizeLine(lines[index] ?? '');
    if (line.length === 0) {
      break;
    }
    collected.push(line);
    if (hasSentenceEnd(line)) {
      break;
    }
  }
  return collected;
}

function trimToSentence(text: string, targetOffset: number): string {
  const start = findSentenceStart(text, targetOffset);
  const end = findSentenceEnd(text, targetOffset);
  return text.slice(start, end).trim();
}

function findSentenceStart(text: string, targetOffset: number): number {
  for (let index = Math.max(0, targetOffset - 1); index >= 0; index -= 1) {
    if (SENTENCE_END_RE.test(text[index] ?? '')) {
      return index + 1;
    }
  }
  return 0;
}

function findSentenceEnd(text: string, targetOffset: number): number {
  for (let index = targetOffset; index < text.length; index += 1) {
    if (SENTENCE_END_RE.test(text[index] ?? '')) {
      return index + 1;
    }
  }
  return text.length;
}

function joinWrappedLines(lines: string[]): string {
  return lines.reduce((result, line) => {
    if (result.length === 0) {
      return line;
    }
    if (result.endsWith('-')) {
      return `${result}${line}`;
    }
    return `${result} ${line}`;
  }, '');
}

function lengthOfJoined(lines: string[]): number {
  return joinWrappedLines(lines).length + (lines.length > 0 ? 1 : 0);
}

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

function hasSentenceEnd(line: string): boolean {
  return SENTENCE_END_RE.test(line);
}
