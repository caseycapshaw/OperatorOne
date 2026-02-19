import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isSetupMode } from "@/lib/setup";
import { OperatorOneMark } from "@/components/brand/operator-one-mark";

export default async function LoginPage() {
  const setupMode = await isSetupMode();
  if (setupMode) redirect("/setup");

  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center">
      <div className="relative w-full max-w-sm border border-grid-border bg-grid-panel/80 p-8 shadow-[var(--shadow-glow-cyan)]">
        {/* Corner accents */}
        <div className="absolute top-0 left-0 h-4 w-[1px] bg-neon-cyan" />
        <div className="absolute top-0 left-0 h-[1px] w-4 bg-neon-cyan" />
        <div className="absolute top-0 right-0 h-4 w-[1px] bg-neon-cyan" />
        <div className="absolute top-0 right-0 h-[1px] w-4 bg-neon-cyan" />
        <div className="absolute bottom-0 left-0 h-4 w-[1px] bg-neon-cyan" />
        <div className="absolute bottom-0 left-0 h-[1px] w-4 bg-neon-cyan" />
        <div className="absolute bottom-0 right-0 h-4 w-[1px] bg-neon-cyan" />
        <div className="absolute bottom-0 right-0 h-[1px] w-4 bg-neon-cyan" />

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <OperatorOneMark size={48} />
          </div>
          <h1 className="text-lg font-bold uppercase tracking-widest">
            <span className="text-text-primary">OPERATOR</span><span className="text-neon-cyan">ONE</span>
          </h1>
          <p className="mt-2 text-xs text-text-muted">
            Identify yourself.
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("authentik", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-3 text-xs font-medium uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/20 hover:shadow-[var(--shadow-glow-cyan)]"
          >
            Sign in with Authentik
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[10px] text-text-muted">
            Secured by Authentik SSO
          </p>
        </div>
      </div>
    </div>
  );
}
