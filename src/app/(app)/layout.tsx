import Nav from "@/components/Nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:flex min-h-screen">
      <div className="contents print:hidden">
        <Nav />
      </div>
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-6xl print:p-0 print:max-w-none">{children}</main>
    </div>
  );
}
