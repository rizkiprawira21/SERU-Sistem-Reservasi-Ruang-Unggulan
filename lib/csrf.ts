import { AppError } from "./errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Proteksi CSRF sederhana untuk route handler yang mengubah data:
 * permintaan browser wajib berasal dari origin yang sama.
 */
export function assertSameOrigin(request: Request): void {
  if (SAFE_METHODS.has(request.method)) return;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");
  if (!host) return;

  const candidate = origin ?? referer;
  if (!candidate) return; // klien non-browser (mis. tes)

  try {
    if (new URL(candidate).host !== host) {
      throw new AppError(
        "INVALID_ORIGIN",
        "Permintaan ditolak karena asal tidak dikenal.",
        403,
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "INVALID_ORIGIN",
      "Permintaan ditolak karena asal tidak dikenal.",
      403,
    );
  }
}
