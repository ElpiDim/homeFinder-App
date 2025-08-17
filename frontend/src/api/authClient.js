// Μικρός client για τα auth endpoints (ίδιο origin με το backend)
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function sendCode(email) {
  const res = await fetch('/api/auth/send-code', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ email })
  });
  return res.json();
}

export async function verifyCode(email, code) {
  const res = await fetch('/api/auth/verify-code', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, code })
  });
  return res.json();
}
