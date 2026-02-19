import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { rootDomain } from "@/lib/utils";
import { getAllSubdomains } from "@/lib/subdomains";

import { AdminDashboard } from "./dashboard";

export const metadata: Metadata = {
  title: `Admin Dashboard | ${rootDomain}`,
  description: `Manage subdomains for ${rootDomain}`,
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/sign-in?next=/admin");
  }

  const tenants = await getAllSubdomains();

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <AdminDashboard tenants={tenants} userEmail={session.user.email} />
    </div>
  );
}
