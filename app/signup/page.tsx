import { AuthSplitShell } from "@/components/auth-split-shell";

import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <AuthSplitShell mode="signup">
      <SignUpForm />
    </AuthSplitShell>
  );
}
