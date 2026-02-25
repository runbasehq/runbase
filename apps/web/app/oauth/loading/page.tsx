import {
  getSafeServerAuthRedirect,
  getSafeServerOrigin,
} from "~/auth/lib/safe-auth-redirect.server";

import { OAuthLoadingClient } from "./oauth-loading-client";

type OAuthLoadingSearchParams = {
  token?: string | string[];
  returnTo?: string | string[];
  next?: string | string[];
  openerOrigin?: string | string[];
  authState?: string | string[];
  type?: string | string[];
  oid?: string | string[];
  handoff?: string | string[];
};

function readSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function OAuthLoadingPage({
  searchParams,
}: {
  searchParams: Promise<OAuthLoadingSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  const rawReturnTo = readSingleParam(resolvedSearchParams.returnTo);
  const rawNext = readSingleParam(resolvedSearchParams.next);
  const rawOpenerOrigin = readSingleParam(resolvedSearchParams.openerOrigin);
  const authState =
    readSingleParam(resolvedSearchParams.authState) ||
    readSingleParam(resolvedSearchParams.token);
  const authType = readSingleParam(resolvedSearchParams.type);
  const oid = readSingleParam(resolvedSearchParams.oid);
  const handoffDone = readSingleParam(resolvedSearchParams.handoff) === "1";

  const safeReturnTo =
    (await getSafeServerAuthRedirect(rawReturnTo)) ||
    (await getSafeServerAuthRedirect(rawNext)) ||
    "/";
  const safeOpenerOrigin = await getSafeServerOrigin(rawOpenerOrigin);

  return (
    <OAuthLoadingClient
      returnTo={safeReturnTo}
      openerOrigin={safeOpenerOrigin}
      authState={authState}
      authType={authType}
      oid={oid}
      handoffDone={handoffDone}
    />
  );
}
