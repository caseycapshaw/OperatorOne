import Link from "next/link";
import { Building2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/queries";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export async function Header() {
  const session = await auth();
  const org = await getCurrentOrganization();
  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "??";

  return (
    <header className="flex h-14 items-center justify-between border-b border-grid-border bg-grid-dark px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 animate-[pulse-glow_2s_ease-in-out_infinite] rounded-full bg-neon-green" />
          <span className="text-[10px] uppercase tracking-widest text-text-muted">
            System Online
          </span>
        </div>

        {org && (
          <Link
            href="/dashboard/admin"
            className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-text-secondary transition-colors hover:text-neon-cyan"
          >
            <Building2 className="h-3 w-3" />
            {org.name}
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-text-secondary">
          {session?.user?.name}
        </span>
        <Avatar>
          {session?.user?.image && (
            <AvatarImage src={session.user.image} alt={session.user.name ?? ""} />
          )}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
