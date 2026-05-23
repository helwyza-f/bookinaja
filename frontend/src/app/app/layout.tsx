export default function AccountAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[#f6f8fb] text-slate-950">{children}</div>;
}
