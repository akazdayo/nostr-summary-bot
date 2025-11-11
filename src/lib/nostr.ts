import { SimplePool, nip19, type Event, finalizeEvent } from "nostr-tools";

export async function getUserDayPosts(
  pubkey: string,
  relays: string[],
  date: Date = new Date(),
): Promise<Event[]> {
  const pool = new SimplePool();

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const since = Math.floor(startOfDay.getTime() / 1000);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  const until = Math.floor(endOfDay.getTime() / 1000);

  const hexkey = nip19.decode(pubkey).data.toString();

  try {
    const events = await pool.querySync(relays, {
      kinds: [1],
      authors: [hexkey],
      since,
      until,
    });

    return events;
  } finally {
    pool.close(relays);
  }
}

export async function publishPost(
  content: string,
  secretKey: string,
  relays: string[],
): Promise<Event> {
  const pool = new SimplePool();

  let hexSecretKey: Uint8Array;
  if (secretKey.startsWith("nsec")) {
    const decoded = nip19.decode(secretKey);
    hexSecretKey = decoded.data as Uint8Array;
  } else {
    hexSecretKey = new Uint8Array(
      secretKey.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
    );
  }
  const event = finalizeEvent(
    {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content,
    },
    hexSecretKey,
  );

  try {
    await Promise.any(pool.publish(relays, event));
    return event;
  } finally {
    pool.close(relays);
  }
}
