import { SessionLayout } from "@/components/session/SessionLayout";

export const metadata = {
  title: "Tu council",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SessionPage() {
  return <SessionLayout />;
}
