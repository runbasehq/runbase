import { Polar } from "@polar-sh/sdk";

type PolarProduct = {
  id: string;
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

async function listProducts(): Promise<PolarProduct[]> {
  const polar = getPolarClient();
  const organizationId = process.env.POLAR_ORGANIZATION_ID?.trim() || undefined;
  const iterator = await polar.products.list({
    organizationId,
    limit: 100,
  });

  const products: PolarProduct[] = [];

  for await (const page of iterator) {
    products.push(...(page.result.items as PolarProduct[]));
  }

  return products;
}

async function createProduct(spec: ProductSpec): Promise<PolarProduct> {
  const polar = getPolarClient();
  const organizationId = process.env.POLAR_ORGANIZATION_ID?.trim() || undefined;

  const created = await polar.products.create({
    name: spec.name,
    description: spec.description,
    recurringInterval: spec.recurringInterval,
    recurringIntervalCount: 1,
    prices: [
      {
        amountType: "fixed",
        priceAmount: spec.priceAmountCents,
        priceCurrency: "usd",
      },
    ],
    metadata: {
      runbase_product_key: spec.key,
      managed_by: "runbase-script",
    },
    organizationId,
  });

  return created as PolarProduct;
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
