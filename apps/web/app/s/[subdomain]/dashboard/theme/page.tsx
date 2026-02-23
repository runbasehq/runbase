export default function DashboardThemePage() {
  return (
    <section className="p-6 md:p-10">
      <div className="w-full max-w-2xl rounded-(--r-md) border border-(--border) bg-(--surface) p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--muted-2)">
          Workspace
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-(--text)">
          Theme
        </h1>
        <p className="mt-3 text-sm text-(--muted)">
          Theme customization controls will be added here.
        </p>
      </div>
    </section>
  );
}
