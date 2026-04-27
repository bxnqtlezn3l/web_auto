import { Suspense } from "react";

import { AuthSplitShell } from "@/components/auth-split-shell";

import { SignInForm } from "./sign-in-form";

function SignInFallback() {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/40 px-6 py-12 text-center text-sm text-zinc-400">
      กำลังโหลด…
    </div>
  );
}

export default function SignInPage() {
  return (
    <AuthSplitShell mode="signin">
      <Suspense fallback={<SignInFallback />}>
        <SignInForm />
      </Suspense>
    </AuthSplitShell>
  );
}
