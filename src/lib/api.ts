const TOKEN_KEY = "cw_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data as T;
}

export const api = {
  auth: {
    signup: (email: string, password: string, displayName?: string) =>
      request("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password, displayName }) }),
    signin: (email: string, password: string) =>
      request("/api/auth/signin", { method: "POST", body: JSON.stringify({ email, password }) }),
    me: () => request("/api/auth/me"),
    forgotPassword: (email: string) =>
      request("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
    resetPassword: (token: string, password: string) =>
      request("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),
  },
  profiles: {
    get: () => request("/api/profiles"),
    update: (data: Record<string, any>) =>
      request("/api/profiles", { method: "PATCH", body: JSON.stringify(data) }),
  },
  analyses: {
    list: () => request("/api/analyses"),
    create: (data: Record<string, any>) =>
      request("/api/analyses", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/api/analyses/${id}`, { method: "DELETE" }),
  },
  trades: {
    list: () => request("/api/trades"),
    create: (data: Record<string, any>) =>
      request("/api/trades", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) =>
      request(`/api/trades/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  riskSettings: {
    get: () => request("/api/risk-settings"),
    update: (data: Record<string, any>) =>
      request("/api/risk-settings", { method: "PATCH", body: JSON.stringify(data) }),
  },
  riskConsent: {
    check: () => request("/api/risk-consent"),
    give: (consent_text: string) =>
      request("/api/risk-consent", { method: "POST", body: JSON.stringify({ consent_text }) }),
  },
  metatrader: {
    getSettings: () => request("/api/metatrader/settings"),
    saveSettings: (data: Record<string, any>) =>
      request("/api/metatrader/settings", { method: "POST", body: JSON.stringify(data) }),
    trade: (data: Record<string, any>) =>
      request("/api/metatrader/trade", { method: "POST", body: JSON.stringify(data) }),
  },
  stripe: {
    checkSubscription: () => request("/api/check-subscription", { method: "POST" }),
    createCheckout: () => request("/api/create-checkout", { method: "POST" }),
    customerPortal: () => request("/api/customer-portal", { method: "POST" }),
  },
};
