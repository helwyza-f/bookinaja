"use client";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  MapPin,
  Clock,
  Globe,
  Mail,
  Smartphone,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export function TenantFooter({ profile, primaryColor = "#3b82f6" }: any) {
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

  return (
    <footer className="bg-white dark:bg-[#050505] pt-32 pb-12 border-t border-slate-100 dark:border-white/5 px-6 overflow-hidden relative">
      {/* Background Decor */}
      <div
        className="absolute bottom-0 right-0 h-96 w-96 opacity-[0.03] blur-[100px] pointer-events-none rounded-full"
        style={{ backgroundColor: primaryColor }}
      />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12">
          {/* --- BRAND COLUMN --- */}
          <div className="lg:col-span-5 space-y-10">
            <div className="flex items-center gap-5">
              <div
                className="h-14 w-14 rounded-[1.2rem] flex items-center justify-center text-white shadow-2xl rotate-3 transition-transform hover:rotate-0 duration-500"
                style={{ backgroundColor: primaryColor }}
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
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                    Verified Business Hub
                  </span>
                </div>
              </div>
            </div>

            <p className="text-slate-500 dark:text-slate-400 max-w-md font-medium italic leading-relaxed text-sm md:text-lg">
              "
              {profile.about_us ||
                profile.description ||
                `Membangun ekosistem ${profile.business_type} terbaik dengan standar kualitas tinggi untuk kepuasan pelanggan.`}
              "
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
                    className="h-14 w-14 rounded-2xl border-2 border-slate-100 dark:border-white/5 bg-transparent transition-all group-hover/social:scale-110 active:scale-95"
                    style={{ borderColor: `var(--social-border)` }}
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
                    className="h-14 w-14 rounded-2xl border-2 border-slate-100 dark:border-white/5 bg-transparent transition-all group-hover/social:scale-110 active:scale-95"
                  >
                    <Smartphone className="h-6 w-6 group-hover/social:text-green-500" />
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* --- INFO COLUMN --- */}
          <div className="lg:col-span-4 space-y-10">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 italic">
              Dispatch Center
            </p>
            <div className="space-y-8">
              <div className="flex items-start gap-5 group">
                <div className="mt-1 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 transition-colors group-hover:bg-white dark:group-hover:bg-white/10 group-hover:shadow-md">
                  <MapPin size={20} style={{ color: primaryColor }} />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Headquarters
                  </p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
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
                <div className="mt-1 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 transition-colors group-hover:bg-white dark:group-hover:bg-white/10 group-hover:shadow-md">
                  <Clock size={20} style={{ color: primaryColor }} />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Hub Hours
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-black rounded-lg">
                      LIVE
                    </span>
                    <p className="text-sm font-[1000] italic uppercase text-slate-700 dark:text-slate-100">
                      {profile.open_time} — {profile.close_time}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- LINKS COLUMN --- */}
          <div className="lg:col-span-3 space-y-10">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 italic">
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
                  Member Console
                </li>
                <li
                  className="hover:translate-x-3 transition-transform cursor-pointer flex items-center gap-3 group"
                  style={{ color: primaryColor }}
                >
                  <div
                    className="h-1 w-1 rounded-full opacity-100"
                    style={{ backgroundColor: primaryColor }}
                  />
                  Direct Support
                </li>
              </ul>

              <div className="pt-4 space-y-4 border-t border-slate-100 dark:border-white/5">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Legal Stack
                </p>
                <div className="flex gap-6 text-[10px] font-bold uppercase tracking-tighter opacity-40">
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
          <div className="flex items-center gap-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            <span className="text-[10px] font-black uppercase tracking-[0.6em]">
              Powered by
            </span>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-white/10 rounded-xl">
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-[10px] font-[1000] uppercase italic tracking-tighter text-slate-900 dark:text-white">
                bookinaja.com
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              &copy; 2026 {profile.name} Enterprise
            </p>
            <p className="text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em]">
              ISO 27001 Certified Infrastructure
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
