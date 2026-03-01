export default function DashboardBillingSettingsPage() {
  return (
    <section className="p-6 md:p-10">
      <div className="mb-6 w-full max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--muted-2)">
          Settings
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-(--text)">
          Billing
        </h1>
        <p className="mt-3 text-sm text-(--muted)">
          Manage your plan, payment method, invoices, and billing details.
        </p>
      </div>

      <div className="w-full max-w-3xl rounded-(--r-md) border border-(--border) bg-(--surface) p-6">
        <p className="text-sm font-medium text-(--text)">Billing dashboard</p>
        <p className="mt-2 text-sm text-(--muted)">
          Billing controls will appear here next. For now, contact support to
          update subscription details.
        </p>
      </div>
    </section>
  );
}
