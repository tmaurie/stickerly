/** Small fetch wrapper for the route handlers: throws the `{ error }` message on failure. */
export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const response = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (!response.ok) {
    let message = `Erreur ${response.status}`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // not JSON
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function imageUrl(albumId: string, file: string, download?: string): string {
  const base = `/api/albums/${albumId}/files/images/${encodeURIComponent(file)}`;
  return download ? `${base}?download=${encodeURIComponent(download)}` : base;
}

export function photoUrl(albumId: string, file: string): string {
  return `/api/albums/${albumId}/files/photos/${encodeURIComponent(file)}`;
}

export function referenceUrl(file: string): string {
  return `/api/references/${encodeURIComponent(file)}`;
}
