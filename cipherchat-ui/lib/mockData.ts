// FAKE DATA for UI work only.
// Teammates: replace these with real Supabase queries + decrypted messages.

export type Contact = {
  id: string;
  name: string;
  email: string;
  verified: boolean; // has the fingerprint been checked?
  fingerprint: string; // their Ed25519 identity-key fingerprint
  lastMessage: string;
  lastTime: string;
  unread: number;
};

export type Message = {
  id: string;
  fromMe: boolean;
  text: string; // decrypted plaintext
  ciphertext: string; // what the server actually stores (base64)
  time: string;
  status: 'ok' | 'tampered'; // 'tampered' = AES-GCM tag check failed
};

export const me = {
  name: 'Your Name',
  username: 'yourname',
  email: 'you@concordia.ca',
  fingerprint: '3F2A 91C0 7B4E D218 A6F3 0C5D 99E1 47B2',
  userId: 'a3f9c2e1-7b4d-4e0a-9c15-2d8f6b0e4a71',
  memberSince: 'November 2026',
  keyCreated: 'Nov 2, 2026 · this browser',
};

// The signed-in user's editable profile (shared across screens).
export type Profile = { name: string; username: string; photo: string | null };

export const contacts: Contact[] = [
  { id: 'bob', name: 'Bob', email: 'bob@concordia.ca', verified: true, fingerprint: 'C81D 0E7A 55F2 9B3C 12AE 6D40 F7B9 0A83', lastMessage: 'Got the session key, sending now', lastTime: '9:41', unread: 0 },
  { id: 'alice', name: 'Alice', email: 'alice@concordia.ca', verified: false, fingerprint: '7E03 B1C4 2D9A 6F81 E55C 03BA 9D27 41F6', lastMessage: 'Can you check the fingerprint?', lastTime: '9:12', unread: 2 },
  { id: 'charlie', name: 'Charlie', email: 'charlie@concordia.ca', verified: true, fingerprint: '19AF 44C2 8E0B 7D35 C6A1 F902 3B58 E4D7', lastMessage: 'Tamper test passed', lastTime: 'Tue', unread: 0 },
  { id: 'david', name: 'David', email: 'david@concordia.ca', verified: true, fingerprint: 'A2D8 5F17 0C9E B346 71FA 2E80 D5C3 96B1', lastMessage: 'Uploading the 4 KB results', lastTime: 'Mon', unread: 1 },
  { id: 'eve', name: 'Eve', email: 'eve@concordia.ca', verified: true, fingerprint: '6C4B E0A9 3172 F8D5 0B6E A49C 2F13 87E0', lastMessage: 'MITM mode is on for this run', lastTime: 'Sun', unread: 0 },
];

export const messagesByContact: Record<string, Message[]> = {
  bob: [
    { id: '1', fromMe: false, text: 'Hey, did the key exchange work?', ciphertext: 'q9F2c0xT8uLw1mZ0bR4+Yk3ePa==', time: '9:38', status: 'ok' },
    { id: '2', fromMe: true, text: 'Yes — fingerprints matched on our call.', ciphertext: 'Zm9vYmFyX2N0X3gyNTUxOV9hZXM=', time: '9:39', status: 'ok' },
    { id: '3', fromMe: false, text: 'Sending the test file now', ciphertext: 'h7Qv0P1sKe9LmN2xYtB0aWcR8g==', time: '9:40', status: 'ok' },
    { id: '4', fromMe: true, text: 'Got it. Running the 1 KB trial.', ciphertext: 'Uk2pX0cZ7nFq4LwA9bVt3sEy1h==', time: '9:41', status: 'ok' },
    { id: '5', fromMe: false, text: '', ciphertext: 'X0X0tampered0X0X0bad0tag0==', time: '9:42', status: 'tampered' },
  ],
  alice: [
    { id: '1', fromMe: false, text: 'Hi! I just added you.', ciphertext: 'pL0aR7vN2qXc8sWm4tYe1uB6==', time: '9:10', status: 'ok' },
    { id: '2', fromMe: false, text: 'Can you check the fingerprint?', ciphertext: 'Tz5kQ1wE9rHy3uIo7pAs2dFg==', time: '9:12', status: 'ok' },
  ],
  charlie: [
    { id: '1', fromMe: true, text: 'I flipped one byte in the ciphertext.', ciphertext: 'Gh8jK2lZ4xCv6bNm0qWe3rTy==', time: 'Tue', status: 'ok' },
    { id: '2', fromMe: false, text: 'Tamper test passed', ciphertext: 'Ui9oP1aS5dFg7hJk3lZx2cVb==', time: 'Tue', status: 'ok' },
  ],
  david: [
    { id: '1', fromMe: false, text: 'Uploading the 4 KB results', ciphertext: 'Nm4qW8eR2tYu6iOp0aSd9fGh==', time: 'Mon', status: 'ok' },
  ],
  eve: [
    { id: '1', fromMe: false, text: 'MITM mode is on for this run', ciphertext: 'Jk7lZ3xC1vBn5mQw9eRt2yUi==', time: 'Sun', status: 'ok' },
  ],
};

export type Call = {
  id: string;
  contactId: string;
  kind: 'incoming' | 'outgoing' | 'missed';
  video: boolean;
  when: string;
};

// UI-only call history (calls are not part of the crypto scope).
export const calls: Call[] = [
  { id: 'c1', contactId: 'bob', kind: 'outgoing', video: false, when: 'Today, 9:30' },
  { id: 'c2', contactId: 'alice', kind: 'missed', video: false, when: 'Today, 8:55' },
  { id: 'c3', contactId: 'charlie', kind: 'incoming', video: true, when: 'Yesterday, 18:02' },
  { id: 'c4', contactId: 'eve', kind: 'missed', video: true, when: 'Sun, 14:20' },
];

export function getContact(id: string) {
  return contacts.find((c) => c.id === id);
}

export function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

// Fake "encrypt" so the ciphertext toggle has something to show for new messages.
export function fakeCiphertext(text: string) {
  if (typeof window === 'undefined') return '';
  return window.btoa(unescape(encodeURIComponent(text))).split('').reverse().join('');
}
