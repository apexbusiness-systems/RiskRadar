const API_ORIGIN = "https://dueradar-api.fly.dev";

function buildUpstreamRequest(inbound: Request, upstreamUrl: URL): Request {
  const headers = new Headers(inbound.headers);
  const sourceUrl = new URL(inbound.url);

  // Ensure upstream host header matches Fly origin to avoid backend host mismatch.
  headers.set("host", upstreamUrl.host);
  // Preserve original edge host/proto for backend logging and auth callback logic.
  headers.set("x-forwarded-host", sourceUrl.host);
  headers.set("x-forwarded-proto", sourceUrl.protocol.replace(":", ""));

  const methodHasBody = !["GET", "HEAD"].includes(inbound.method.toUpperCase());

  return new Request(upstreamUrl.toString(), {
    method: inbound.method,
    headers,
    body: methodHasBody ? inbound.body : undefined,
    redirect: "manual",
  });
}

export const onRequest: PagesFunction = async ({ request }) => {
  const inboundUrl = new URL(request.url);
  const upstreamUrl = new URL(inboundUrl.pathname + inboundUrl.search, API_ORIGIN);

  const upstreamRequest = buildUpstreamRequest(request, upstreamUrl);
  const upstreamResponse = await fetch(upstreamRequest);

  // Return upstream response verbatim to preserve status, cookies, and body semantics.
  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: upstreamResponse.headers,
  });
};
