"use client";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 px-2 pb-20 pt-5 font-plus-jakarta md:px-4">
      <div className="mx-auto flex max-w-350 flex-col gap-4">
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
