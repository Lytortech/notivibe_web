const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.vbfbergrtgrtgrtrt.pro').replace(/\/$/, '');

async function request(path, token, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }
  if (!response.ok) {
    const message = data.message || data.error || data.detail || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

export const checkSubscription = (uid, token) =>
  request(`/api/v1/n1/subscription/status/${encodeURIComponent(uid)}`, token);

export const createPairing = (token) =>
  request('/api/v1/n1/pairing/create', token, { method: 'POST', body: JSON.stringify({}) });

export const getPairingStatus = (token) =>
  request('/api/v1/n1/pairing/status', token);

export { API_BASE };

export const createPurchaseOrder = (payload, token) =>
  request('/api/v1/n1/subscription/purchase/create', token, {
    method: 'POST',
    headers: { 'Idempotency-Key': payload.idempotencyKey },
    body: JSON.stringify(payload)
  });

export const confirmPurchase = (payload, token) =>
  request('/api/v1/n1/subscription/purchase/confirm', token, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
