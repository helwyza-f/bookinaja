import Link from "next/link";
import { ShieldCheck, FileText, ArrowRight, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type LegalSection = {
  title: string;
  body: string[];
  bullets?: string[];
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  effectiveDate: string;
  introTitle: string;
  introBody: string;
  sections: LegalSection[];
};

export function LegalPage({
  eyebrow,
  title,
  subtitle,
  effectiveDate,
  introTitle,
  introBody,
  sections,
}: LegalPageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background selection:bg-blue-600/30">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 h-[960px] w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.14)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_85%_80%_at_50%_40%,#000_100%,transparent_100%)]" />
      </div>

      <div className="container relative z-10 mx-auto max-w-5xl px-6 pt-24 md:pt-32 pb-24">
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <Badge
              variant="outline"
              className="rounded-full border-blue-500/20 bg-blue-500/5 px-5 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-blue-600"
            >
              <FileText className="mr-2 h-3.5 w-3.5" />
              {eyebrow}
            </Badge>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.95]">
            {title}
          </h1>
          <p className="mx-auto max-w-3xl text-base md:text-xl font-semibold text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            Berlaku sejak {effectiveDate}
          </div>
        </div>

        <div className="mt-12 rounded-[2.5rem] border border-border bg-card/40 p-6 md:p-8 backdrop-blur-sm shadow-sm">
          <div className="space-y-3">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-600">
              Ringkasan
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
              {introTitle}
            </h2>
            <p className="text-sm md:text-base font-medium leading-relaxed text-muted-foreground">
              {introBody}
            </p>
          </div>
        </div>

        <div className="mt-10 space-y-6">
          {sections.map((section, index) => (
            <section
              key={section.title}
              className="rounded-[2rem] border border-border bg-card/40 p-6 md:p-8 backdrop-blur-sm shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-600/20">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0 flex-1 space-y-4">
                  <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
                    {section.title}
                  </h2>
                  <div className="space-y-3">
                    {section.body.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="text-sm md:text-[15px] font-medium leading-relaxed text-muted-foreground"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                  {section.bullets?.length ? (
                    <div className="grid gap-3">
                      {section.bullets.map((bullet) => (
                        <div
                          key={bullet}
                          className="flex items-start gap-3 rounded-[1.4rem] border border-border/80 bg-background/70 px-4 py-3"
                        >
                          <Circle className="mt-1 h-2.5 w-2.5 shrink-0 fill-blue-600 text-blue-600" />
                          <p className="text-sm font-semibold leading-relaxed text-foreground/85">
                            {bullet}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-[2.5rem] border border-border bg-blue-600/5 p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="text-sm font-black uppercase tracking-widest text-foreground">
                Butuh bantuan atau klarifikasi?
              </div>
              <p className="max-w-2xl text-sm font-semibold leading-relaxed text-muted-foreground">
                Jika ada pertanyaan tentang kebijakan ini, hubungi tim Bookinaja di{" "}
                <a className="text-blue-600 underline underline-offset-4" href="mailto:support@bookinaja.com">
                  support@bookinaja.com
                </a>
                .
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/faq">
                <Button
                  variant="secondary"
                  className="w-full rounded-2xl px-6 font-black uppercase tracking-widest sm:w-auto"
                >
                  Lihat FAQ
                </Button>
              </Link>
              <Link href="/register">
                <Button className="w-full rounded-2xl bg-blue-600 px-6 font-black uppercase tracking-widest text-white hover:bg-blue-700 sm:w-auto">
                  Mulai dengan Bookinaja
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { LegalSection };
