import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';
import { closeSessionDb, getSession, saveSession } from '../sidepanel-lib/sessions';
import type { Session } from '../shared/types';

const session: Session = {
  url: 'https://arxiv.org/pdf/1234.5678',
  title: 'Test Paper',
  model: { providerId: 'deepseek', model: 'deepseek-chat' },
  updatedAt: 1,
  messages: [
    {
      id: 'm1',
      role: 'assistant',
      content: 'Hello',
      kind: 'chat',
      status: 'done',
    },
  ],
};

describe('sessions', () => {
  beforeEach(async () => {
    await closeSessionDb();
    await deleteDB('ask_ai');
  });

  it('returns null for a missing session', async () => {
    await expect(getSession('missing')).resolves.toBeNull();
  });

  it('saves and reads back a session', async () => {
    await saveSession(session);

    await expect(getSession(session.url)).resolves.toEqual(session);
  });

  it('updates an existing session by URL', async () => {
    await saveSession(session);
    const updated: Session = {
      ...session,
      title: 'Updated Paper',
      updatedAt: 2,
      messages: [...session.messages, { ...session.messages[0]!, id: 'm2', content: 'Updated' }],
    };

    await saveSession(updated);

    await expect(getSession(session.url)).resolves.toEqual(updated);
  });
});
