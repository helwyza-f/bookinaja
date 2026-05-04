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
  const sectionBackgroundClass =
    preset === "boutique"
      ? "bg-[#fffdf9] dark:bg-[#0f0c0a] border-stone-100 dark:border-white/5"
      : preset === "sunset-glow"
        ? "bg-[linear-gradient(180deg,#fffaf5_0%,#fff1e8_100%)] dark:bg-[#120804] border-orange-100 dark:border-orange-500/10"
      : preset === "playful"
        ? "bg-[linear-gradient(180deg,#ffffff_0%,#f0fdf4_100%)] dark:bg-[#03120d] border-emerald-100/70 dark:border-emerald-500/10"
        : preset === "mono-luxe"
          ? "bg-[linear-gradient(180deg,#ffffff_0%,#eef2f7_100%)] dark:bg-[#020617] border-slate-200 dark:border-white/5"
        : preset === "dark-pro"
          ? "bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] dark:bg-[#020617] border-slate-200 dark:border-white/5"
          : "bg-white dark:bg-[#050505] border-slate-100 dark:border-white/5";
  const iconPanelClass =
    preset === "boutique"
      ? "bg-[#fff8f1] dark:bg-[#171412]"
      : preset === "sunset-glow"
        ? "bg-[#fff1e8] dark:bg-[#1a0d08]"
      : preset === "playful"
        ? "bg-emerald-50 dark:bg-[#082114]"
        : preset === "mono-luxe"
          ? "bg-slate-100 dark:bg-[#0b1120]"
        : preset === "dark-pro"
          ? "bg-slate-100 dark:bg-white/10"
          : "bg-slate-50 dark:bg-white/5";
  const subtleTextClass =
    preset === "boutique"
      ? "text-stone-400 dark:text-stone-300"
      : preset === "sunset-glow"
        ? "text-orange-500 dark:text-orange-300"
      : preset === "playful"
        ? "text-emerald-600 dark:text-emerald-300"
        : preset === "mono-luxe"
          ? "text-slate-500 dark:text-slate-300"
        : "text-slate-400 dark:text-slate-300";
  const bodyTextClass =
    preset === "boutique"
      ? "text-stone-600 dark:text-stone-300"
      : preset === "sunset-glow"
        ? "text-orange-900/85 dark:text-orange-100/85"
      : preset === "playful"
        ? "text-emerald-800 dark:text-emerald-100"
        : preset === "mono-luxe"
          ? "text-slate-800 dark:text-slate-100"
        : preset === "dark-pro"
          ? "text-slate-700 dark:text-slate-200"
          : "text-slate-700 dark:text-slate-200";
  const socialButtonClass =
    preset === "boutique"
      ? "border-stone-200 text-stone-700 hover:bg-[#fff8f1] dark:border-white/10 dark:text-stone-100 dark:hover:bg-[#1f1a17]"
      : preset === "sunset-glow"
        ? "border-orange-200 text-orange-800 hover:bg-[#fff1e8] dark:border-orange-500/20 dark:text-orange-100 dark:hover:bg-[#2a140b]"
      : preset === "playful"
        ? "border-emerald-100 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/20 dark:text-emerald-100 dark:hover:bg-[#123321]"
        : preset === "mono-luxe"
          ? "border-slate-300 text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:text-slate-100 dark:hover:bg-slate-800"
        : preset === "dark-pro"
          ? "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-100 dark:hover:bg-slate-800"
          : "border-slate-100 text-slate-700 hover:bg-slate-50 dark:border-white/5 dark:text-slate-100 dark:hover:bg-white/10";
  const lowContrastTextClass =
    preset === "boutique"
      ? "text-stone-500/80 dark:text-stone-300/80"
      : preset === "sunset-glow"
        ? "text-orange-700/85 dark:text-orange-200/80"
      : preset === "playful"
        ? "text-emerald-700/80 dark:text-emerald-200/80"
        : preset === "mono-luxe"
          ? "text-slate-600/85 dark:text-slate-300/80"
        : "text-slate-500/80 dark:text-slate-300/80";

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
                <h3 className="text-3xl md:text-4xl font-[1000] italic uppercase tracking-tighter leading-none text-slate-900 dark:text-white">
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

            <p className={cn("max-w-md font-medium italic leading-relaxed text-sm md:text-lg", subtleTextClass)}>
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
          <div className="lg:col-span-4 space-y-10">
            <p className={cn("text-[10px] font-black uppercase tracking-[0.5em] italic", subtleTextClass)}>
              Dispatch Center
            </p>
            <div className="space-y-8">
              <div className="flex items-start gap-5 group">
                <div className={cn("mt-1 p-3 transition-colors group-hover:bg-white dark:group-hover:bg-white/10 group-hover:shadow-md", panelRadiusClass, iconPanelClass)}>
                  <MapPin size={20} style={{ color: primaryColor }} />
                </div>
                <div className="space-y-2">
                  <p className={cn("text-xs font-black uppercase tracking-widest", subtleTextClass)}>
                    Headquarters
                  </p>
                  <p className={cn("text-sm font-bold leading-relaxed", bodyTextClass)}>
                    {profile.address ||
                      "Location data pending synchronization."}
                  </p>
                  {profile.map_iframe_url && (
                    <a
                      href={profile.map_iframe_url}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-[10px] font-black text-blue-500 uppercase italic hover:underline"
                    >
                      View on Maps <ArrowUpRight size={10} />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-5 group">
                <div className={cn("mt-1 p-3 transition-colors group-hover:bg-white dark:group-hover:bg-white/10 group-hover:shadow-md", panelRadiusClass, iconPanelClass)}>
                  <Clock size={20} style={{ color: primaryColor }} />
                </div>
                <div className="space-y-2">
                  <p className={cn("text-xs font-black uppercase tracking-widest", subtleTextClass)}>
                    Hub Hours
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-black rounded-lg">
                      LIVE
                    </span>
                    <p className={cn("text-sm font-[1000] italic uppercase", bodyTextClass)}>
                      {profile.open_time} — {profile.close_time}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- LINKS COLUMN --- */}
          <div className="lg:col-span-3 space-y-10">
            <p className={cn("text-[10px] font-black uppercase tracking-[0.5em] italic", subtleTextClass)}>
              Network
            </p>
            <div className="grid grid-cols-1 gap-10">
              <ul className="space-y-5 font-[1000] uppercase italic text-xs tracking-[0.2em] text-slate-800 dark:text-slate-200">
                <li className="hover:translate-x-3 transition-transform cursor-pointer flex items-center gap-3 group">
                  <div
                    className="h-1 w-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: primaryColor }}
                  />
                  Experience Catalog
                </li>
                <li className="hover:translate-x-3 transition-transform cursor-pointer flex items-center gap-3 group">
                  <div
                    className="h-1 w-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: primaryColor }}
                  />
                  Direct Support
                </li>

                <li
                  className="hover:translate-x-3 transition-transform cursor-pointer flex items-center gap-3 group"
                  style={{ color: primaryColor }}
                >
                  <div
                    className="h-1 w-1 rounded-full opacity-100"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <Link href={"/admin/login"}>Login Admin</Link>
                </li>
              </ul>

              <div className="pt-4 space-y-4 border-t border-slate-100 dark:border-white/5">
                <p className={cn("text-[9px] font-black uppercase tracking-widest", subtleTextClass)}>
                  Legal Stack
                </p>
                <div className={cn("flex gap-6 text-[10px] font-bold uppercase tracking-tighter", lowContrastTextClass)}>
                  <span className="hover:opacity-100 cursor-pointer transition-opacity">
                    Privacy
                  </span>
                  <span className="hover:opacity-100 cursor-pointer transition-opacity">
                    Terms
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- DYNAMIC BOTTOM BAR --- */}
        <div className="mt-24 pt-10 border-t border-slate-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            <span className={cn("text-[10px] font-black uppercase tracking-[0.6em]", lowContrastTextClass)}>
              Powered by
            </span>
            <div className={cn("flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-white/10", panelRadiusClass)}>
              <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
              <span className="text-[10px] font-[1000] uppercase italic tracking-tighter text-slate-900 dark:text-white">
                bookinaja.com
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-1">
            <p className={cn("text-[10px] font-black uppercase tracking-widest", subtleTextClass)}>
              &copy; 2026 {profile.name} Enterprise
            </p>
            <p className={cn("text-[8px] font-bold uppercase tracking-[0.3em]", lowContrastTextClass)}>
              ISO 27001 Certified Infrastructure
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
