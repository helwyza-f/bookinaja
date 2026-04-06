"use client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, MapPin, Clock, Globe, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

// Custom SVG Icons karena Lucide tidak punya brand icons
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

const FacebookIcon = ({ className }: { className?: string }) => (
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
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export function TenantFooter({ profile, activeTheme }: any) {
  // Fallback links jika tenant belum setting social media
  const socialLinks = [
    {
      id: "ig",
      icon: InstagramIcon,
      href: profile.instagram_url || "https://instagram.com/bookinaja",
    },
    {
      id: "fb",
      icon: FacebookIcon,
      href: profile.facebook_url || "#",
    },
  ];

  return (
    <footer className="bg-white dark:bg-[#050505] pt-32 pb-12 border-t border-slate-200 dark:border-white/5 px-6 overflow-hidden">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8">
          {/* --- BRAND COLUMN (Col-5) --- */}
          <div className="lg:col-span-5 space-y-8">
            <div className="flex items-center gap-4 animate-in fade-in duration-700">
              <div
                className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3",
                  activeTheme.bgPrimary,
                )}
              >
                <ShieldCheck size={26} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-3xl font-[900] italic uppercase tracking-tighter leading-none">
                  {profile.name}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                  Authorized Partner
                </span>
              </div>
            </div>

            <p className="text-slate-500 dark:text-slate-400 max-w-md font-medium italic leading-relaxed text-sm md:text-base">
              "
              {profile.description ||
                `Kami bangga melayani komunitas ${profile.name} dengan standar fasilitas terbaik dan sistem reservasi yang instan.`}
              "
            </p>

            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.id}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-14 w-14 rounded-2xl border-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-all active:scale-90"
                  >
                    <social.icon className="h-6 w-6" />
                  </Button>
                </a>
              ))}
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-2xl border-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-all active:scale-90"
              >
                <Mail className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* --- INFO COLUMN (Col-4) --- */}
          <div className="lg:col-span-4 space-y-8">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 italic">
              Location & Contact
            </p>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "mt-1 p-2 rounded-lg bg-slate-100 dark:bg-white/5",
                    activeTheme.primary,
                  )}
                >
                  <MapPin size={18} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold uppercase tracking-tight">
                    Main Address
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    {profile.address ||
                      "Alamat belum diatur oleh pemilik bisnis."}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "mt-1 p-2 rounded-lg bg-slate-100 dark:bg-white/5",
                    activeTheme.primary,
                  )}
                >
                  <Clock size={18} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold uppercase tracking-tight">
                    Operational
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest">
                    Setiap Hari: {profile.open_time} - {profile.close_time}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* --- LINKS COLUMN (Col-3) --- */}
          <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-12">
            <div className="space-y-6">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 italic">
                Quick Links
              </p>
              <ul className="space-y-4 font-black uppercase italic text-xs tracking-widest">
                <li className="hover:translate-x-2 transition-transform cursor-pointer">
                  Catalog
                </li>
                <li className="hover:translate-x-2 transition-transform cursor-pointer">
                  Member Portal
                </li>
                <li className="hover:translate-x-2 transition-transform cursor-pointer text-blue-500 italic">
                  Get Help
                </li>
              </ul>
            </div>
            <div className="space-y-6">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 italic">
                Safety
              </p>
              <ul className="space-y-4 font-black uppercase italic text-xs tracking-widest opacity-40">
                <li>Privacy Policy</li>
                <li>Refund Policy</li>
              </ul>
            </div>
          </div>
        </div>

        {/* --- BOTTOM SECTION --- */}
        <div className="mt-24 pt-12 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 opacity-30">
            <span className="text-[10px] font-black uppercase tracking-[0.5em]">
              Powered by
            </span>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-white/10 rounded-md">
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-tighter">
                bookinaja.com
              </span>
            </div>
          </div>

          <p className="text-[9px] font-bold opacity-20 uppercase tracking-[0.2em] text-center">
            All rights reserved &copy; 2026 {profile.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
