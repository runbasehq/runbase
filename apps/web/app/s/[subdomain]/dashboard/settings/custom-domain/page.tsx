import { DashboardDomainManager } from "~/dashboard/components/dashboard-domain-manager";
import { loadDomainsForWorkspace } from "~/domains/lib/load-domains.server";

export default async function DashboardCustomDomainSettingsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const initialDomains = await loadDomainsForWorkspace(subdomain);

  return (
    <section className="p-6 md:p-10">
      <div className="mb-6 w-full max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--muted-2)">
          Settings
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-(--text)">
          Custom domain
        </h1>
        <p className="mt-3 text-sm text-(--muted)">
          Connect your domain, verify DNS records, and route traffic to this
          workspace.
        </p>
      </div>

      <DashboardDomainManager initialDomains={initialDomains} />
    </section>
  );
}
