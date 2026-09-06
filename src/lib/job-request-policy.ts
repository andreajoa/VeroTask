export const MIN_JOB_LEAD_MS = 60 * 60 * 1000;
export const QUOTE_CLOSE_BUFFER_MS = 30 * 60 * 1000;
export const MAX_QUOTE_WINDOW_MS = 48 * 60 * 60 * 1000;

export function quoteWindowEndFor(scheduledStart: Date, now = new Date()) {
  const closeBeforeService = scheduledStart.getTime() - QUOTE_CLOSE_BUFFER_MS;
  if (closeBeforeService <= now.getTime()) throw new Error("quote_window_unavailable");
  return new Date(Math.min(closeBeforeService, now.getTime() + MAX_QUOTE_WINDOW_MS));
}
