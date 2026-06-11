import type { ChatMessage } from './types';

const OMISSION_MARKER = '[...中间内容已省略...]';
const DEFAULT_CONTEXT_BUDGET = 24000;

export interface TranslationPromptInput {
  paperTitle: string;
  context: string;
  text: string;
  targetLang: string;
}

export interface DiscussionPromptInput {
  paperTitle: string;
  fullText: string;
  history: ChatMessage[];
  question: string;
  budget?: number;
}

export function truncatePaperText(text: string, budget: number = DEFAULT_CONTEXT_BUDGET): string {
  if (text.length <= budget) {
    return text;
  }

  const headLength = Math.floor(budget * 0.6);
  const tailLength = budget - headLength;
  return `${text.slice(0, headLength)}\n\n${OMISSION_MARKER}\n\n${text.slice(-tailLength)}`;
}

export function buildTranslationMessages(input: TranslationPromptInput): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        `Translate the selected paper text into ${input.targetLang}.`,
        'Preserve technical terms and make the translation concise and faithful.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `Paper title: ${input.paperTitle}`,
        '',
        'Nearby context:',
        input.context || '(none)',
        '',
        'Selected text:',
        input.text,
      ].join('\n'),
    },
  ];
}

export function buildDiscussionMessages(input: DiscussionPromptInput): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are a paper reading assistant. Answer using the paper context below.',
        `Paper title: ${input.paperTitle}`,
        '',
        'Paper context:',
        truncatePaperText(input.fullText, input.budget),
      ].join('\n'),
    },
    ...input.history,
    { role: 'user', content: input.question },
  ];
}
