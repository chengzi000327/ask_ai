import { openDB, type DBSchema } from 'idb';
import type { Session } from '../shared/types';

const DB_NAME = 'ask_ai';
const DB_VERSION = 1;
const SESSION_STORE = 'sessions';
let dbPromise: ReturnType<typeof openSessionDbInternal> | undefined;

interface AskAiDb extends DBSchema {
  sessions: {
    key: string;
    value: Session;
    indexes: {
      updatedAt: number;
    };
  };
}

export async function getSession(url: string): Promise<Session | null> {
  const db = await openSessionDb();
  return (await db.get(SESSION_STORE, url)) ?? null;
}

export async function saveSession(session: Session): Promise<void> {
  const db = await openSessionDb();
  await db.put(SESSION_STORE, session, session.url);
}

export async function closeSessionDb(): Promise<void> {
  const db = await dbPromise;
  db?.close();
  dbPromise = undefined;
}

function openSessionDb() {
  dbPromise ??= openSessionDbInternal();
  return dbPromise;
}

function openSessionDbInternal() {
  return openDB<AskAiDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE).createIndex('updatedAt', 'updatedAt');
      }
    },
  });
}
