import Link from "next/link";
import { AccountPanel } from "@/components/auth/AccountPanel";
import { Container } from "@/components/ui/Container";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Cuenta",
  description: "Ajustes privados de tu cuenta de COUNCILia.",
  path: "/account",
  index: false,
});

interface AccountPageProps {
  searchParams?: {
    from?: string;
  };
}

const RETURN_LINKS: Record<string, string> = {
  home: "/?from=account",
  session: "/session",
};

export default function AccountPage({ searchParams }: AccountPageProps) {
  const backHref = RETURN_LINKS[searchParams?.from ?? ""] ?? "/";

  return (
    <main className="min-h-dvh py-14 md:py-20">
      <Container className="max-w-5xl">
        <Link
          href={backHref}
          className="text-xs uppercase tracking-wider text-muted hover:text-foreground"
        >
          ← Regresar
        </Link>
        <div className="mt-8 md:mt-10">
          <AccountPanel />
        </div>
      </Container>
    </main>
  );
}
