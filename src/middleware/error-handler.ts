import type { Context, Next } from "hono";
import type { Env } from "../lib/types";

export async function errorHandler(c: Context<Env>, next: Next) {
  try {
    await next();
  } catch (err) {
    console.error("Unhandled error:", err);
    const status = (err as any).status ?? 500;

    if (c.req.header("Accept")?.includes("application/json")) {
      return c.json({ error: "Internal Server Error" }, status);
    }

    return c.html(
      `<html><body><h1>${status} Error</h1><p>Something went wrong.</p></body></html>`,
      status
    );
  }
}
