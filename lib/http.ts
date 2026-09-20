import "server-only";
import { explainError } from "./ai";
import { NotFoundError } from "./storage";

/** Wraps a route handler so thrown errors come back as `{ error }` JSON the UI can display. */
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof NotFoundError) return Response.json({ error: err.message }, { status: 404 });
      const { message, status } = explainError(err);
      return Response.json({ error: message }, { status });
    }
  };
}
