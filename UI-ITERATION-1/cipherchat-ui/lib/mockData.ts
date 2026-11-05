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
  email: 'you@concordia.ca',
  fingerprint: '3F2A 91C0 7B4E D218 A6F3 0C5D 99E1 47B2',
};

export const contacts: Contact[] = [
  { id: 'bob', name: 'Bob', email: 'bob@concordia.ca', verified: true, fingerprint: 'C81D 0E7A 55F2 9B3C 12AE 6D40 F7B9 0A83', lastMessage: 'Got the session key, sending now', lastTime: '9:41' },
  { id: 'alice', name: 'Alice', email: 'alice@concordia.ca', verified: false, fingerprint: '7E03 B1C4 2D9A 6F81 E55C 03BA 9D27 41F6', lastMessage: 'Can you check the fingerprint?', lastTime: '9:12' },
  { id: 'charlie', name: 'Charlie', email: 'charlie@concordia.ca', verified: true, fingerprint: '19AF 44C2 8E0B 7D35 C6A1 F902 3B58 E4D7', lastMessage: 'Tamper test passed', lastTime: 'Tue' },
  { id: 'david', name: 'David', email: 'david@concordia.ca', verified: true, fingerprint: 'A2D8 5F17 0C9E B346 71FA 2E80 D5C3 96B1', lastMessage: 'Uploading the 4 KB results', lastTime: 'Mon' },
  { id: 'eve', name: 'Eve', email: 'eve@concordia.ca', verified: true, fingerprint: '6C4B E0A9 3172 F8D5 0B6E A49C 2F13 87E0', lastMessage: 'MITM mode is on for this run', lastTime: 'Sun' },
];

export const messagesByContact: Record<string, Message[]> = {
  bob: [
    { id: '1', fromMe: false, text: 'Hey, did the key exchange work?', ciphertext: 'q9F2c0xT8uLw1mZ0bR4+Yk3ePa==', time: '9:38', status: 'ok' },
    { id: '2', fromMe: true, text: 'Yes — fingerprints matched on our call.', ciphertext: 'Zm9vYmFyX2N0X3gyNTUxOV9hZXM=', time: '9:39', status: 'ok' },
    { id: '3', fromMe: false, text: 'Sending the test file now', ciphertext: 'h7Qv0P1sKe9LmN2xYtB0aWcR8g==', time: '9:40', status: 'ok' },
    { id: '4', fromMe: true, text: 'Got it. Running the 1 KB trial.', ciphertext: 'Uk2pX0cZ7nFq4LwA9bVt3sEy1h==', time: '9:41', status: 'ok' },
    { id: '5', fromMe: false, text: '', ciphertext: 'X0X0tampered0X0X0bad0tag0==', time: '9:42', status: 'tampered' },
  ],
};

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
