import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function UserVerifyFailedPage({
  searchParams,
}: {
  searchParams?: { reason?: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <Card className="w-full max-w-md rounded-[2rem] border-white/10 bg-white/5 p-8">
        <div className="space-y-4 text-center">
          <div className="text-[9px] font-black uppercase tracking-[0.35em] text-red-300">
            Booking verification failed
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">
            Akses tidak valid
          </h1>
          <p className="text-sm leading-7 text-slate-300">
            {searchParams?.reason || "unknown_error"}
          </p>
          <Button asChild className="rounded-2xl bg-white text-slate-950 hover:bg-slate-100">
            <Link href="/user/login">Kembali ke login</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
