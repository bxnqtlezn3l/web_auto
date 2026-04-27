import dynamic from "next/dynamic";

const FacebookStoryPanel = dynamic(
  () =>
    import("@/components/facebook-story-panel").then(
      (m) => m.FacebookStoryPanel,
    ),
  {
    loading: () => (
      <div className="flex min-h-[12rem] items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-sm text-muted-foreground dark:border-white/10">
        กำลังโหลดสตอรี่…
      </div>
    ),
  },
);

export default function DashboardStoryPage() {
  return <FacebookStoryPanel />;
}
