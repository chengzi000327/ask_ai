import { describe, expect, it } from 'vitest';
import { expandToSentence } from '../shared/sentence';

describe('expandToSentence', () => {
  it('expands a middle line to sentence boundaries across neighboring lines', () => {
    const lines = [
      'Previous sentence ends here.',
      'The Transformer architecture',
      'uses self-attention to model dependencies',
      'between tokens. Another sentence starts.',
    ];

    expect(expandToSentence(lines, 1)).toBe(
      'The Transformer architecture uses self-attention to model dependencies between tokens.',
    );
  });

  it('handles the beginning of a document without a previous boundary', () => {
    const lines = ['A paper starts with an abstract', 'that spans two lines.', 'Next sentence.'];

    expect(expandToSentence(lines, 0)).toBe('A paper starts with an abstract that spans two lines.');
  });

  it('joins hyphenated words split across lines', () => {
    const lines = ['This method improves cross-', 'domain generalization substantially.'];

    expect(expandToSentence(lines, 0)).toBe(
      'This method improves cross-domain generalization substantially.',
    );
  });

  it('recognizes Chinese sentence punctuation', () => {
    const lines = ['前一句已经结束。', '这个方法用于论文阅读', '并支持中文句号。后一句开始。'];

    expect(expandToSentence(lines, 1)).toBe('这个方法用于论文阅读 并支持中文句号。');
  });
});
