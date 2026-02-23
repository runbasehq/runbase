import { TeamMembersSettings } from "~/workspace-members/components/team-members-settings";
import { loadWorkspaceTeamSnapshot } from "~/workspace-members/lib/load-workspace-team.server";

export default async function DashboardTeamSettingsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const initialSnapshot = await loadWorkspaceTeamSnapshot(subdomain);

  return (
    <section className="p-6 md:p-10">
      <div className="mb-6 w-full max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--muted-2)">
          Settings
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-(--text)">
          Team
        </h1>
        <p className="mt-3 text-sm text-(--muted)">
          Invite teammates, assign roles, and manage workspace membership.
        </p>
      </div>

      <TeamMembersSettings initialSnapshot={initialSnapshot} />
    </section>
  );
}
