import { describe, expect, it } from 'vitest';
import {
  buildDiscussionMessages,
  buildTranslationMessages,
  truncatePaperText,
} from '../shared/prompts';
import type { ChatMessage } from '../shared/types';

describe('prompts', () => {
  it('leaves paper text unchanged when it fits the budget', () => {
    expect(truncatePaperText('short paper', 20)).toBe('short paper');
  });

  it('keeps head 60 percent and tail 40 percent with an omission marker when over budget', () => {
    const source = 'A'.repeat(60) + 'M'.repeat(40) + 'Z'.repeat(40);
    const truncated = truncatePaperText(source, 50);

    expect(truncated).toBe(`${'A'.repeat(30)}\n\n[...中间内容已省略...]\n\n${'Z'.repeat(20)}`);
  });

  it('builds translation messages with title, context, target language, and source text', () => {
    const messages = buildTranslationMessages({
      paperTitle: 'Attention Is All You Need',
      context: 'The Transformer uses attention.',
      text: 'Scaled dot-product attention is used.',
      targetLang: '中文',
    });

    expect(messages).toEqual([
      expect.objectContaining({
        role: 'system',
        content: expect.stringContaining('中文'),
      }),
      expect.objectContaining({
        role: 'user',
        content: expect.stringContaining('Attention Is All You Need'),
      }),
    ]);
    expect(messages[1]?.content).toContain('The Transformer uses attention.');
    expect(messages[1]?.content).toContain('Scaled dot-product attention is used.');
  });

  it('builds discussion messages with truncated full paper context and history', () => {
    const history: ChatMessage[] = [{ role: 'assistant', content: 'Previous answer.' }];
    const messages = buildDiscussionMessages({
      paperTitle: 'Long Paper',
      fullText: 'Introduction. Contributions. Conclusion.',
      history,
      question: 'What is the main contribution?',
      budget: 100,
    });

    expect(messages).toEqual([
      expect.objectContaining({
        role: 'system',
        content: expect.stringContaining('Long Paper'),
      }),
      history[0],
      { role: 'user', content: 'What is the main contribution?' },
    ]);
    expect(messages[0]?.content).toContain('Introduction. Contributions. Conclusion.');
  });
});
