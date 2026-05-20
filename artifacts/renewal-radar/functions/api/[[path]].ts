const API_ORIGIN = "https://dueradar-api.fly.dev";

export const onRequest: PagesFunction = async (context) => {
  const inbound = context.request;
  const inboundUrl = new URL(inbound.url);
  const upstreamUrl = new URL(inboundUrl.pathname + inboundUrl.search, API_ORIGIN);

  const headers = new Headers(inbound.headers);
  headers.set("host", new URL(API_ORIGIN).host);
  headers.set("x-forwarded-host", inboundUrl.host);
  headers.set("x-forwarded-proto", inboundUrl.protocol.replace(":", ""));

  const upstreamResponse = await fetch(upstreamUrl, {
    method: inbound.method,
    headers,
    body: inbound.body,
    redirect: "manual",
    // @ts-expect-error Cloudflare runtime supports streaming request bodies.
    duplex: "half",
  });

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: upstreamResponse.headers,
  });
};
