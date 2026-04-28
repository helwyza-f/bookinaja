import { Loader2, Pencil, Save, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type SectionShellProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  saving: boolean;
  editing: boolean;
  view: React.ReactNode;
  children: React.ReactNode;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
};

export function SectionShell({
  title,
  description,
  icon: Icon,
  saving,
  editing,
  view,
  children,
  onEdit,
  onCancel,
  onSave,
}: SectionShellProps) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950 md:p-5">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-white/10 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-950 dark:text-white">{title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving} className="h-10 rounded-xl">
              <X className="mr-2 h-4 w-4" />
              Batal
            </Button>
            <Button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={onEdit} className="h-10 rounded-xl">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
      </div>
      <div className="pt-4">{editing ? children : view}</div>
    </Card>
  );
}

export function ViewGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
}

export function ViewItem({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-1 min-h-5 break-words text-sm font-semibold text-slate-950 dark:text-white">
        {value || "-"}
      </div>
    </div>
  );
}
