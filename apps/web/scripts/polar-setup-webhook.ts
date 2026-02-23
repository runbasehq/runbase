import { Polar } from "@polar-sh/sdk";

const defaultEvents = [
  "subscription.created",
  "subscription.updated",
  "subscription.active",
  "subscription.canceled",
  "subscription.revoked",
  "subscription.uncanceled",
  "order.paid",
  "customer.state_changed",
] as const;

type WebhookEndpoint = {
  id: string;
  url: string;
  secret?: string;
};

function getPolarClient() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN?.trim();

  if (!accessToken) {
    throw new Error("Missing POLAR_ACCESS_TOKEN");
  }

  const explicitUrl = process.env.POLAR_API_BASE_URL?.trim();
  const environment = process.env.POLAR_ENVIRONMENT?.trim().toLowerCase();

  return new Polar({
    accessToken,
    server: environment === "production" ? "production" : "sandbox",
    serverURL: explicitUrl || undefined,
  });
}

async function listWebhookEndpoints(): Promise<WebhookEndpoint[]> {
  const polar = getPolarClient();
  const organizationId = process.env.POLAR_ORGANIZATION_ID?.trim() || undefined;
  const iterator = await polar.webhooks.listWebhookEndpoints({
    organizationId,
    limit: 100,
  });

  const endpoints: WebhookEndpoint[] = [];

  for await (const page of iterator) {
    endpoints.push(...(page.result.items as WebhookEndpoint[]));
  }

  return endpoints;
}

async function main() {
  const webhookUrl = process.env.POLAR_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    throw new Error("Missing POLAR_WEBHOOK_URL");
  }

  const organizationId = process.env.POLAR_ORGANIZATION_ID?.trim() || undefined;
  const existing = (await listWebhookEndpoints()).find(
    (endpoint) => endpoint.url === webhookUrl,
  );

  if (existing) {
    process.stdout.write(`Webhook already exists: ${existing.id}\n`);
    return;
  }

  const polar = getPolarClient();
  const created = (await polar.webhooks.createWebhookEndpoint({
    url: webhookUrl,
    format: "raw",
    events: [...defaultEvents],
    organizationId,
  })) as WebhookEndpoint;

  process.stdout.write(`Webhook created: ${created.id}\n`);

  if (created.secret) {
    process.stdout.write(`POLAR_WEBHOOK_SECRET=${created.secret}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});

export {};
