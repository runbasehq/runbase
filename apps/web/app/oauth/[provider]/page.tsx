import { redirect } from "next/navigation";

import { OAuthProviderClient } from "~/auth/components/oauth-provider-client";

type SocialProvider = "google" | "github";

function isSocialProvider(value: string): value is SocialProvider {
  return value === "google" || value === "github";
}

function readSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function OAuthProviderPage({
  params,
  searchParams,
}: {
  params: Promise<{ provider: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { provider } = await params;

  if (!isSocialProvider(provider)) {
    redirect("/sign-in");
  }

  const resolvedSearchParams = await searchParams;

  return (
    <OAuthProviderClient
      provider={provider}
      openerOrigin={readSingleParam(resolvedSearchParams.openerOrigin)}
      authState={readSingleParam(resolvedSearchParams.authState)}
      next={readSingleParam(resolvedSearchParams.next)}
      type={readSingleParam(resolvedSearchParams.type)}
      oid={readSingleParam(resolvedSearchParams.oid)}
    />
  );
}
