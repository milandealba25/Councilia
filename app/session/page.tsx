import { SessionLayout } from "@/components/session/SessionLayout";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Tu council",
  description: "Espacio privado de deliberación con Marco, Elena y Rafael.",
  path: "/session",
  index: false,
});

export default function SessionPage() {
  return <SessionLayout />;
}
