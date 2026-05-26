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

export default function AccountPage() {
  return (
    <main className="min-h-dvh py-16">
      <Container className="max-w-2xl">
        <Link
          href="/"
          className="text-xs uppercase tracking-wider text-muted hover:text-foreground"
        >
          ← Inicio
        </Link>
        <div className="mt-10">
          <AccountPanel />
        </div>
      </Container>
    </main>
  );
}
