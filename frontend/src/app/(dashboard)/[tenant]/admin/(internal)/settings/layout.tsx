"use client";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 px-3 pb-20 pt-4 font-plus-jakarta md:px-4">
      <div className="mx-auto max-w-[1600px]">
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
