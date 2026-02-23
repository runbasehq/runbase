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
  enabled: boolean;
  secret?: string;
};

function getPolarBaseUrl() {
  const explicit = process.env.POLAR_API_BASE_URL?.trim();

  if (explicit) {
    return explicit;
  }

  if (process.env.POLAR_ENVIRONMENT?.trim().toLowerCase() === "production") {
    return "https://api.polar.sh";
  }

  return "https://sandbox-api.polar.sh";
}

function getAuthHeaders() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN?.trim();

  if (!accessToken) {
    throw new Error("Missing POLAR_ACCESS_TOKEN");
  }

  return {
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
  };
}

async function polarRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getPolarBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(
      `Polar API ${response.status} ${response.statusText}: ${await response.text()}`,
    );
  }

  return (await response.json()) as T;
}

function readEndpoints(payload: unknown): WebhookEndpoint[] {
  if (Array.isArray(payload)) {
    return payload as WebhookEndpoint[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    "items" in payload &&
    Array.isArray((payload as { items?: unknown }).items)
  ) {
    return (payload as { items: WebhookEndpoint[] }).items;
  }

  return [];
}

async function main() {
  const webhookUrl = process.env.POLAR_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    throw new Error("Missing POLAR_WEBHOOK_URL");
  }

  const organizationId = process.env.POLAR_ORGANIZATION_ID?.trim() || null;

  const existingList = await polarRequest<unknown>(
    "/v1/webhooks/endpoints?limit=100",
  );
  const existing = readEndpoints(existingList).find(
    (endpoint) => endpoint.url === webhookUrl,
  );

  if (existing) {
    process.stdout.write(`Webhook already exists: ${existing.id}\n`);
    return;
  }

  const body: Record<string, unknown> = {
    url: webhookUrl,
    format: "raw",
    events: [...defaultEvents],
  };

  if (organizationId) {
    body.organization_id = organizationId;
  }

  const created = await polarRequest<WebhookEndpoint>(
    "/v1/webhooks/endpoints",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

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
