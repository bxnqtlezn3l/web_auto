import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { FacebookToolProvider } from "@/components/facebook-tool-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user ?? { email: null, name: null };

  return (
    <FacebookToolProvider>
      <DashboardShell user={user}>{children}</DashboardShell>
    </FacebookToolProvider>
  );
}
