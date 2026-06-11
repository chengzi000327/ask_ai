import type { ChatMessage, ModelRef, PaperContext, TranslatePayload } from './types';

export const CHAT_PORT_NAME = 'chat';

export type BusMessage =
  | ({ type: 'TRANSLATE_REQUEST' } & TranslatePayload)
  | { type: 'TRANSLATE_PUSH'; payload: TranslatePayload }
  | { type: 'PAPER_LOADED'; url: string; title: string; fullText: string }
  | { type: 'GET_PAPER'; url: string }
  | { type: 'GET_PENDING_TRANSLATE' }
  | { type: 'BYPASS_PDF'; url: string };

export type BusResponse<T extends BusMessage = BusMessage> = T extends { type: 'GET_PAPER' }
  ? PaperContext | null
  : T extends { type: 'GET_PENDING_TRANSLATE' }
    ? TranslatePayload | null
    : void;

export interface ChatPortRequest {
  sessionUrl: string;
  model: ModelRef;
  messages: ChatMessage[];
}

export type ChatPortEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; full: string }
  | { type: 'error'; message: string; status?: number };

export function createTranslateRequest(payload: TranslatePayload): BusMessage {
  return { type: 'TRANSLATE_REQUEST', ...payload };
}

export function createTranslatePush(payload: TranslatePayload): BusMessage {
  return { type: 'TRANSLATE_PUSH', payload };
}
