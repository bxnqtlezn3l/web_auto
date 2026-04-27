import dynamic from "next/dynamic";

const FacebookGroupDashboardPage = dynamic(
  () =>
    import("@/components/facebook-group-dashboard-page").then(
      (m) => m.FacebookGroupDashboardPage,
    ),
  {
    loading: () => (
      <div className="flex min-h-[12rem] items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-sm text-muted-foreground dark:border-white/10">
        กำลังโหลดแดชบอร์ดโพสต์…
      </div>
    ),
  },
);

export default function DashboardPostPage() {
  return <FacebookGroupDashboardPage />;
}
