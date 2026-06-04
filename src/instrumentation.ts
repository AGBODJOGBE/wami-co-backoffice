/**
 * Server-only boot hook. Runs once when the Next.js server starts.
 *
 * Forces every outbound `fetch` call (handled by Node's built-in undici
 * dispatcher) to connect over IPv4. Without this, hosts that publish a
 * dead AAAA record — like the ForYou API gateway — cause `fetch failed
 * (cause=ETIMEDOUT)` after ~300 ms because undici tries the v6 route and
 * doesn't fall back to v4 cleanly.
 *
 * Note: `dns.setDefaultResultOrder("ipv4first")` does NOT help here —
 * undici resolves independently of the global Node DNS order. Setting the
 * dispatcher explicitly is the only reliable fix.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { Agent, setGlobalDispatcher } = await import("undici");
  setGlobalDispatcher(
    new Agent({
      connect: {
        family: 4,
        // Connection timeout in ms — slightly below our request timeout
        // so we surface a clear error instead of getting stuck.
        timeout: 10_000,
      },
      // Keep sockets alive so successive requests don't pay TCP+TLS again.
      keepAliveTimeout: 10_000,
      keepAliveMaxTimeout: 30_000,
    }),
  );
}
