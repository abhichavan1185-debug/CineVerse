import axios from "axios";

const ACCESS_KEY = "showtime_access_token";
const REFRESH_KEY = "showtime_refresh_token";

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api = axios.create({
  baseURL: "/api",
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On a 401, try one silent refresh before giving up — avoids booting the
// user out of a seat-selection flow just because the access token expired.
let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && tokenStore.getRefresh()) {
      original._retry = true;
      refreshing =
        refreshing ??
        api
          .post("/auth/login/refresh/", { refresh: tokenStore.getRefresh() })
          .then((r) => {
            tokenStore.set(r.data.access, tokenStore.getRefresh()!);
            return r.data.access as string;
          })
          .catch(() => {
            tokenStore.clear();
            return null;
          })
          .finally(() => {
            refreshing = null;
          });
      const newAccess = await refreshing;
      if (newAccess) {
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

/** Every API error is normalized by the backend into {error: {code, message, detail}}. */
export function apiErrorMessage(err: unknown, fallback = "Something went wrong."): string {
  const anyErr = err as any;
  return (
    anyErr?.response?.data?.error?.message ||
    anyErr?.response?.data?.error ||
    anyErr?.message ||
    fallback
  );
}
