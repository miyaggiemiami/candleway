import { supabase } from "@/integrations/supabase/client";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data as T;
}

export const api = {
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
