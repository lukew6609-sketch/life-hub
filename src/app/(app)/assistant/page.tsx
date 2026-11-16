import Chat from "@/components/Chat";
import { PageHeader } from "@/components/ui";

export default async function Assistant({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <div>
      <PageHeader title="Ask AI" subtitle="Ask anything about your bills, policies, cars and documents" />
      <Chat initial={q} />
    </div>
  );
}
