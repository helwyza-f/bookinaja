"use client";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  MapPin,
  Clock,
  Smartphone,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { BuilderProfile } from "@/lib/page-builder";
import { getLandingPresetTone } from "./theme-preset";

// Custom Brand Icons
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

type TenantFooterProps = {
  profile: BuilderProfile;
  primaryColor?: string;
  accentColor?: string;
  preset?: string;
  radiusStyle?: string;
};

export function TenantFooter({
  profile,
  primaryColor = "#3b82f6",
  accentColor,
  preset = "bookinaja-classic",
  radiusStyle = "rounded",
}: TenantFooterProps) {
  const tone = getLandingPresetTone(preset);
  // Mapping socials dari data profil asli
  const socialLinks = [
    {
      id: "ig",
      icon: InstagramIcon,
      href: profile.instagram_url,
      label: "Instagram",
    },
    {
      id: "tiktok",
      icon: TikTokIcon,
      href: profile.tiktok_url,
      label: "TikTok",
    },
  ].filter((link) => link.href); // Hanya tampilkan yang ada linknya

  const panelRadiusClass =
    radiusStyle === "square" ? "rounded-[1rem]" : radiusStyle === "soft" ? "rounded-[1.4rem]" : "rounded-2xl";
  const sectionBackgroundClass = tone.section;
  const iconPanelClass = tone.iconPanel;
  const subtleTextClass = tone.eyebrow;
  const bodyTextClass = tone.body;
  const socialButtonClass = tone.social;
  const lowContrastTextClass = tone.lowContrast;
  const footerCardClass = cn("border", panelRadiusClass, tone.panel);
  const footerIconChipClass = cn("mt-1 p-3 border", panelRadiusClass, tone.panel);
  const footerDividerClass =
    preset === "playful" || preset === "sunset-glow"
      ? "border-white/10 dark:border-white/12"
      : "border-slate-200 dark:border-white/10";

  return (
    <footer className={cn("pt-32 pb-12 border-t px-6 overflow-hidden relative", sectionBackgroundClass)}>
      {/* Background Decor */}
      <div
        className="absolute bottom-0 right-0 h-96 w-96 opacity-[0.03] blur-[100px] pointer-events-none rounded-full"
        style={{ backgroundColor: accentColor || primaryColor }}
      />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12">
          {/* --- BRAND COLUMN --- */}
          <div className="lg:col-span-5 space-y-10">
            <div className="flex items-center gap-5">
              <div
                className={cn("h-14 w-14 flex items-center justify-center text-white shadow-2xl rotate-3 transition-transform hover:rotate-0 duration-500", panelRadiusClass)}
                style={{ backgroundColor: primaryColor, boxShadow: `0 16px 32px ${accentColor || primaryColor}33` }}
              >
                <ShieldCheck size={30} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <h3 className={cn("text-3xl md:text-4xl font-[1000] italic uppercase tracking-tighter leading-none", tone.title)}>
                  {profile.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="h-1 w-3 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span className={cn("text-[10px] font-black uppercase tracking-[0.3em]", lowContrastTextClass)}>
                    Verified Business Hub
                  </span>
                </div>
              </div>
            </div>

            <p className={cn("max-w-md font-medium italic leading-relaxed text-sm md:text-lg", tone.subtle)}>
              &quot;
              {profile.about_us ||
                profile.description ||
                `Membangun ekosistem ${profile.business_type} terbaik dengan standar kualitas tinggi untuk kepuasan pelanggan.`}
              &quot;
            </p>

            <div className="flex flex-wrap gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.id}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/social"
                >
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn("h-14 w-14 border-2 bg-transparent transition-all group-hover/social:scale-110 active:scale-95", panelRadiusClass, socialButtonClass)}
                  >
                    <social.icon className="h-6 w-6 transition-colors group-hover/social:text-slate-900 dark:group-hover/social:text-white" />
                  </Button>
                </a>
              ))}

              {profile.whatsapp_number && (
                <a
                  href={`https://wa.me/${profile.whatsapp_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/social"
                >
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn("h-14 w-14 border-2 bg-transparent transition-all group-hover/social:scale-110 active:scale-95", panelRadiusClass, socialButtonClass)}
                  >
                    <Smartphone className="h-6 w-6 group-hover/social:text-green-500" />
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* --- INFO COLUMN --- */}
          <div className="lg:col-span-7 space-y-10">
            <p className={cn("text-[10px] font-black uppercase tracking-[0.5em] italic", subtleTextClass)}>
              Info singkat
            </p>
            <div className="grid gap-5 md:grid-cols-2">
              <div className={cn("p-5", footerCardClass, iconPanelClass)}>
                <div className="flex items-start gap-4">
                <div className={footerIconChipClass}>
                    <MapPin size={18} style={{ color: primaryColor }} />
                  </div>
                  <div className="space-y-2">
                    <p className={cn("text-[10px] font-black uppercase tracking-[0.24em]", subtleTextClass)}>
                      Lokasi
                    </p>
                    <p className={cn("text-sm font-semibold leading-relaxed", bodyTextClass)}>
                      {profile.address || "Alamat akan tampil di sini saat bisnis sudah melengkapinya."}
                    </p>
                    {profile.map_iframe_url ? (
                      <a
                        href={profile.map_iframe_url}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-500 hover:underline"
                      >
                        Buka peta <ArrowUpRight size={10} />
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className={cn("p-5", footerCardClass, iconPanelClass)}>
                <div className="flex items-start gap-4">
                <div className={footerIconChipClass}>
                    <Clock size={18} style={{ color: primaryColor }} />
                  </div>
                  <div className="space-y-2">
                    <p className={cn("text-[10px] font-black uppercase tracking-[0.24em]", subtleTextClass)}>
                      Jam operasional
                    </p>
                    <p className={cn("text-sm font-semibold leading-relaxed", bodyTextClass)}>
                      {profile.open_time && profile.close_time
                        ? `${profile.open_time} — ${profile.close_time}`
                        : "Jam buka akan tampil di sini."}
                    </p>
                    <p className={cn("text-xs", lowContrastTextClass)}>
                      Customer bisa lanjut booking atau hubungi bisnis lewat Bookinaja.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a href="#catalog">
                <Button
                  className="border-none text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Lihat katalog
                </Button>
              </a>
              {profile.whatsapp_number ? (
                <a href={`https://wa.me/${profile.whatsapp_number}`} target="_blank" rel="noreferrer">
                  <Button variant="outline" className={cn("border-2 bg-transparent", socialButtonClass)}>Hubungi via WhatsApp</Button>
                </a>
              ) : null}
              <Link href="/admin/login">
                <Button variant="outline" className={cn("border-2 bg-transparent", socialButtonClass)}>
                  Login Admin
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* --- DYNAMIC BOTTOM BAR --- */}
        <div className={cn("mt-20 flex flex-col items-start justify-between gap-4 border-t pt-8 md:flex-row md:items-center", footerDividerClass)}>
          <div className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em]", lowContrastTextClass)}>
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: primaryColor }} />
            Powered by Bookinaja
          </div>

          <div className={cn("flex items-center gap-5 text-[10px] font-bold uppercase tracking-[0.18em]", lowContrastTextClass)}>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
