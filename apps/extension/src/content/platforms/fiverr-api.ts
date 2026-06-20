export interface FiverrApiMessage {
  body?: string;
  sender?: string;
  recipient?: string;
  createdAt?: number;
  repliedToMessage?: { body?: string; sender?: string; createdAt?: number };
}

interface FiverrConversationBatch {
  messages?: FiverrApiMessage[];
  lastPage?: boolean;
  conversationId?: string;
}

const CONVERSATION_BASE = 'https://www.fiverr.com/inbox/contacts';

/** Fetch full conversation via Fiverr's inbox JSON API (stable when DOM classes rotate). */
export async function fetchFiverrConversation(username: string): Promise<FiverrApiMessage[]> {
  const collected: FiverrApiMessage[] = [];
  let timestamp: number | null = null;
  let lastPage = false;
  let batches = 0;
  const maxBatches = 20;

  while (!lastPage && batches < maxBatches) {
    const url = timestamp
      ? `${CONVERSATION_BASE}/${encodeURIComponent(username)}/conversation?timestamp=${timestamp}`
      : `${CONVERSATION_BASE}/${encodeURIComponent(username)}/conversation`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Fiverr conversation fetch failed (${response.status})`);
    }

    const data = (await response.json()) as FiverrConversationBatch;
    const batch = data.messages ?? [];
    if (batch.length === 0) break;

    collected.push(...batch);
    lastPage = Boolean(data.lastPage);

    if (!lastPage) {
      const oldest = Math.min(...batch.map((message) => message.createdAt ?? Number.MAX_SAFE_INTEGER));
      if (!Number.isFinite(oldest) || oldest === Number.MAX_SAFE_INTEGER) break;
      timestamp = oldest;
    }

    batches += 1;
  }

  return collected.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
}
