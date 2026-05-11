"use client";

export function getLandingPresetTone(preset?: string) {
  switch (preset || "bookinaja-classic") {
    case "boutique":
      return {
        shell:
          "border-stone-200/75 bg-[#fffaf2]/92 text-stone-900 dark:border-white/10 dark:bg-[#171412]/90 dark:text-white",
        section:
          "bg-[#fffdf9] dark:bg-[#0f0c0a] border-stone-100 dark:border-white/5",
        panel:
          "border-stone-200 bg-[#fffdf9] dark:border-white/10 dark:bg-[#171412]",
        iconPanel: "bg-[#fff8f1] dark:bg-[#171412]",
        title: "text-stone-900 dark:text-white",
        body: "text-stone-700 dark:text-stone-300",
        subtle: "text-stone-600 dark:text-stone-300",
        eyebrow: "text-stone-500 dark:text-stone-300",
        lowContrast: "text-stone-500/90 dark:text-stone-300/80",
        social:
          "border-stone-200 text-stone-700 hover:bg-[#fff8f1] dark:border-white/10 dark:text-stone-100 dark:hover:bg-[#1f1a17]",
        card:
          "border-stone-200 bg-[#fffdf9] shadow-[0_18px_55px_rgba(41,37,36,0.08)] dark:border-white/10 dark:bg-[#171412]",
        cardMuted: "text-stone-500 dark:text-stone-300",
      };
    case "sunset-glow":
      return {
        shell:
          "border-orange-200/70 bg-[#fff7ed]/92 text-slate-950 dark:border-orange-500/20 dark:bg-[#1f0d06]/90 dark:text-white",
        section:
          "bg-[linear-gradient(180deg,#fffaf5_0%,#fff1e8_100%)] dark:bg-[linear-gradient(180deg,#1a0905_0%,#120804_58%,#0d0503_100%)] border-orange-100 dark:border-orange-400/15",
        panel:
          "border-orange-200 bg-[#fffaf5] dark:border-orange-400/20 dark:bg-[#21100a]",
        iconPanel: "bg-[#fff1e8] dark:bg-[#190d08]",
        title: "text-orange-950 dark:text-orange-50",
        body: "text-orange-900/90 dark:text-orange-50/92",
        subtle: "text-orange-800 dark:text-orange-100/90",
        eyebrow: "text-orange-600 dark:text-orange-200/90",
        lowContrast: "text-orange-700/90 dark:text-orange-100/82",
        social:
          "border-orange-200 text-orange-800 hover:bg-[#fff1e8] dark:border-orange-400/20 dark:text-orange-50 dark:hover:bg-[#2a140b]",
        card:
          "border-orange-200 bg-[#fffaf5] shadow-[0_18px_55px_rgba(124,45,18,0.1)] dark:border-orange-400/20 dark:bg-[#1c0e09]",
        cardMuted: "text-orange-700 dark:text-orange-100/82",
      };
    case "playful":
      return {
        shell:
          "border-emerald-200/80 bg-[#f6fff8]/94 text-emerald-950 dark:border-emerald-500/20 dark:bg-[#082114]/90 dark:text-white",
        section:
          "bg-[linear-gradient(180deg,#fcfffd_0%,#effcf3_100%)] dark:bg-[linear-gradient(180deg,#04160f_0%,#03120d_55%,#020d09_100%)] border-emerald-100/70 dark:border-emerald-400/15",
        panel:
          "border-emerald-200 bg-[#fcfffd] dark:border-emerald-400/20 dark:bg-[#0a2117]",
        iconPanel: "bg-emerald-50 dark:bg-[#092016]",
        title: "text-emerald-950 dark:text-emerald-50",
        body: "text-emerald-900/92 dark:text-emerald-50/92",
        subtle: "text-emerald-800 dark:text-emerald-100/90",
        eyebrow: "text-emerald-700 dark:text-emerald-200/90",
        lowContrast: "text-emerald-700/90 dark:text-emerald-100/82",
        social:
          "border-emerald-200 text-emerald-900 hover:bg-emerald-50 dark:border-emerald-400/20 dark:text-emerald-50 dark:hover:bg-[#123321]",
        card:
          "border-emerald-200 bg-[#fcfffd] shadow-[0_16px_48px_rgba(20,83,45,0.08)] dark:border-emerald-400/20 dark:bg-[#082114]",
        cardMuted: "text-emerald-700 dark:text-emerald-100/82",
      };
    case "mono-luxe":
      return {
        shell:
          "border-slate-300/80 bg-white/94 text-slate-950 dark:border-white/10 dark:bg-[#0b1120]/92 dark:text-white",
        section:
          "bg-[linear-gradient(180deg,#ffffff_0%,#eef2f7_100%)] dark:bg-[linear-gradient(180deg,#040915_0%,#020617_56%,#01040c_100%)] border-slate-200 dark:border-white/10",
        panel:
          "border-slate-300 bg-white dark:border-white/12 dark:bg-[#0b1220]",
        iconPanel: "bg-slate-100 dark:bg-[#09111d]",
        title: "text-slate-950 dark:text-slate-50",
        body: "text-slate-800 dark:text-slate-100/92",
        subtle: "text-slate-700 dark:text-slate-200/90",
        eyebrow: "text-slate-500 dark:text-slate-300/92",
        lowContrast: "text-slate-600/90 dark:text-slate-300/84",
        social:
          "border-slate-300 text-slate-800 hover:bg-slate-100 dark:border-white/12 dark:text-slate-50 dark:hover:bg-slate-800",
        card:
          "border-slate-300 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.09)] dark:border-white/12 dark:bg-[#0a0f1a]",
        cardMuted: "text-slate-600 dark:text-slate-300/84",
      };
    case "dark-pro":
      return {
        shell:
          "border-slate-300/80 bg-slate-50/94 text-slate-950 dark:border-white/10 dark:bg-[#060d19]/92 dark:text-white",
        section:
          "bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] dark:bg-[linear-gradient(180deg,#030815_0%,#020617_58%,#01040a_100%)] border-slate-200 dark:border-white/10",
        panel:
          "border-slate-300 bg-white/92 dark:border-white/12 dark:bg-[#09111f]",
        iconPanel: "bg-slate-100 dark:bg-[#0f172a]",
        title: "text-slate-950 dark:text-white",
        body: "text-slate-800 dark:text-slate-100/92",
        subtle: "text-slate-700 dark:text-slate-200/90",
        eyebrow: "text-slate-500 dark:text-slate-300/92",
        lowContrast: "text-slate-600/90 dark:text-slate-300/84",
        social:
          "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-white/12 dark:text-slate-50 dark:hover:bg-slate-800",
        card:
          "border-slate-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(241,245,249,0.95))] shadow-[0_16px_48px_rgba(15,23,42,0.12)] dark:border-white/12 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(9,13,24,0.96))]",
        cardMuted: "text-slate-500 dark:text-slate-300/84",
      };
    default:
      return {
        shell:
          "border-slate-200/70 bg-white/92 text-slate-950 dark:border-white/10 dark:bg-[#0b1120]/88 dark:text-white",
        section:
          "bg-white dark:bg-[#050505] border-slate-100 dark:border-white/5",
        panel:
          "border-slate-200 bg-white dark:border-white/10 dark:bg-[#050505]",
        iconPanel: "bg-slate-50 dark:bg-white/5",
        title: "text-slate-950 dark:text-white",
        body: "text-slate-700 dark:text-slate-200",
        subtle: "text-slate-700 dark:text-slate-300",
        eyebrow: "text-slate-500 dark:text-slate-300",
        lowContrast: "text-slate-500/90 dark:text-slate-300/80",
        social:
          "border-slate-100 text-slate-700 hover:bg-slate-50 dark:border-white/5 dark:text-slate-100 dark:hover:bg-white/10",
        card:
          "border-slate-200 bg-white/92 shadow-[0_16px_50px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/6",
        cardMuted: "text-slate-600 dark:text-slate-300",
      };
  }
}
