type PolarProduct = {
  id: string;
  name: string;
  metadata?: Record<string, unknown> | null;
};

type ProductSpec = {
  envVar: string;
  key: string;
  name: string;
  description: string;
  recurringInterval: "month" | "year";
  priceAmountCents: number;
};

type PolarTrialInterval = "day" | "week" | "month" | "year";

const specs: ProductSpec[] = [
  {
    envVar: "POLAR_PRODUCT_ID_GROWTH_MONTHLY",
    key: "growth_monthly",
    name: "Runbase Growth Monthly",
    description: "Growth plan billed monthly",
    recurringInterval: "month",
    priceAmountCents: 900,
  },
  {
    envVar: "POLAR_PRODUCT_ID_GROWTH_YEARLY",
    key: "growth_yearly",
    name: "Runbase Growth Yearly",
    description: "Growth plan billed yearly",
    recurringInterval: "year",
    priceAmountCents: 8400,
  },
  {
    envVar: "POLAR_PRODUCT_ID_PROFESSIONAL_MONTHLY",
    key: "professional_monthly",
    name: "Runbase Professional Monthly",
    description: "Professional plan billed monthly",
    recurringInterval: "month",
    priceAmountCents: 1900,
  },
  {
    envVar: "POLAR_PRODUCT_ID_PROFESSIONAL_YEARLY",
    key: "professional_yearly",
    name: "Runbase Professional Yearly",
    description: "Professional plan billed yearly",
    recurringInterval: "year",
    priceAmountCents: 18000,
  },
];

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

function decodeTrialInterval(
  value: string | undefined,
): PolarTrialInterval | null {
  const normalized = (value ?? "").trim().toLowerCase();

  if (
    normalized === "day" ||
    normalized === "week" ||
    normalized === "month" ||
    normalized === "year"
  ) {
    return normalized;
  }

  return null;
}

function decodePositiveInt(value: string | undefined): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function getTrialConfig() {
  const interval = decodeTrialInterval(process.env.POLAR_TRIAL_INTERVAL);
  const intervalCount = decodePositiveInt(
    process.env.POLAR_TRIAL_INTERVAL_COUNT,
  );

  if (!interval || !intervalCount) {
    return null;
  }

  return {
    interval,
    intervalCount,
  };
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

function readProducts(payload: unknown): PolarProduct[] {
  if (Array.isArray(payload)) {
    return payload as PolarProduct[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    "items" in payload &&
    Array.isArray((payload as { items?: unknown }).items)
  ) {
    return (payload as { items: PolarProduct[] }).items;
  }

  return [];
}

async function listProducts() {
  const response = await polarRequest<unknown>("/v1/products/?limit=100");
  return readProducts(response);
}

async function createProduct(spec: ProductSpec): Promise<PolarProduct> {
  const organizationId = process.env.POLAR_ORGANIZATION_ID?.trim() || null;
  const trialConfig = getTrialConfig();
  const body: Record<string, unknown> = {
    name: spec.name,
    description: spec.description,
    recurring_interval: spec.recurringInterval,
    recurring_interval_count: 1,
    prices: [
      {
        amount_type: "fixed",
        price_amount: spec.priceAmountCents,
        price_currency: "usd",
      },
    ],
    metadata: {
      runbase_product_key: spec.key,
      managed_by: "runbase-script",
    },
  };

  if (organizationId) {
    body.organization_id = organizationId;
  }

  if (trialConfig) {
    body.trial_interval = trialConfig.interval;
    body.trial_interval_count = trialConfig.intervalCount;
  }

  return polarRequest<PolarProduct>("/v1/products/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function main() {
  const existingProducts = await listProducts();

  const envOutput: string[] = [];

  for (const spec of specs) {
    const existing = existingProducts.find((product) => {
      const metadata =
        product.metadata && typeof product.metadata === "object"
          ? (product.metadata as Record<string, unknown>)
          : {};

      return metadata.runbase_product_key === spec.key;
    });

    if (existing) {
      envOutput.push(`${spec.envVar}=${existing.id}`);
      continue;
    }

    const created = await createProduct(spec);
    envOutput.push(`${spec.envVar}=${created.id}`);
  }

  envOutput.push("POLAR_PRODUCT_ID_ENTERPRISE=");

  process.stdout.write(`${envOutput.join("\n")}\n`);
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});

export {};
