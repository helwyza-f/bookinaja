"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Coffee,
  Minus,
  Plus,
  PlusCircle,
  ReceiptText,
  Search,
  Timer,
  X,
} from "lucide-react";
import { toast } from "sonner";

type CatalogItem = {
  id: string;
  name: string;
  category?: string;
  price?: number;
  unit_price?: number;
  quantity?: number;
};

type BookingLite = {
  unit_duration?: number;
  unit_price?: number;
};

type ApiError = {
  response?: { data?: { error?: string } };
  message?: string;
};

type ControllerProps = {
  active: boolean;
  booking: BookingLite;
  menuItems: CatalogItem[];
  addonItems: CatalogItem[];
  onExtend: (count: number) => Promise<void>;
  onOrderFnb: (cart: CatalogItem[]) => Promise<void>;
  onOrderAddon: (cart: CatalogItem[]) => Promise<void>;
  onComplete?: () => void;
};

type ConfirmState =
  | {
      kind: "extend" | "fnb" | "addon" | "complete";
      title: string;
      description: string;
      confirmLabel: string;
      tone: "blue" | "orange" | "emerald" | "slate";
      action: () => Promise<void> | void;
    }
  | null;

function MobileSheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl dark:bg-[#0b1020] sm:max-w-lg sm:rounded-[2rem]">
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-200 dark:bg-white/20" />
        </div>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-white/10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              {eyebrow}
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
              {title}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-white/10"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function BookingLiveController({
  active,
  booking,
  menuItems,
  addonItems,
  onExtend,
  onOrderFnb,
  onOrderAddon,
  onComplete,
}: ControllerProps) {
  const [extendOpen, setExtendOpen] = useState(false);
  const [fnbOpen, setFnbOpen] = useState(false);
  const [addonOpen, setAddonOpen] = useState(false);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [menuSearch, setMenuSearch] = useState("");
  const [addonSearch, setAddonSearch] = useState("");
  const [menuCart, setMenuCart] = useState<Record<string, CatalogItem & { quantity: number }>>({});
  const [addonCart, setAddonCart] = useState<Record<string, CatalogItem & { quantity: number }>>({});
  const [selectedExtend, setSelectedExtend] = useState<number>(1);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!extendError) return;
    toast.error(extendError, {
      description:
        extendError === "MAX SESSION REACHED"
          ? "Sesi booking sudah mencapai batas maksimal pada hari ini."
          : "Coba lagi atau hubungi admin tenant jika masalah berlanjut.",
    });
  }, [extendError]);

  const unitDuration = Number(booking?.unit_duration || 60);
  const extOptions = [1, 2, 3, 4];
  const menuItemsInCart = Object.values(menuCart);
  const addonItemsInCart = Object.values(addonCart);
  const formatIDR = (value: number) =>
    new Intl.NumberFormat("id-ID").format(Number(value || 0));

  const filteredMenu = useMemo(
    () =>
      menuItems.filter((item) =>
        `${item.name} ${item.category || ""}`
          .toLowerCase()
          .includes(menuSearch.toLowerCase()),
      ),
    [menuItems, menuSearch],
  );

  const filteredAddons = useMemo(
    () =>
      addonItems.filter((item) =>
        `${item.name}`.toLowerCase().includes(addonSearch.toLowerCase()),
      ),
    [addonItems, addonSearch],
  );

  const menuTotal = menuItemsInCart.reduce(
    (sum, item) =>
      sum + Number(item.price || item.unit_price || 0) * Number(item.quantity || 0),
    0,
  );
  const addonTotal = addonItemsInCart.reduce(
    (sum, item) =>
      sum + Number(item.price || item.unit_price || 0) * Number(item.quantity || 0),
    0,
  );

  const openConfirm = (next: ConfirmState) => {
    setConfirmState(next);
  };

  const runConfirmedAction = async () => {
    if (!confirmState) return;
    setSubmitting(true);
    try {
      await confirmState.action();
      setConfirmState(null);
    } catch (error) {
      const err = error as ApiError;
      const message = String(err?.response?.data?.error || err?.message || "Aksi gagal");
      if (confirmState.kind === "extend" && message.toLowerCase().includes("max extension")) {
        setExtendError("MAX SESSION REACHED");
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <ActionTile
          disabled={!active}
          title="Tambah Durasi"
          icon={Timer}
          tone="blue"
          onClick={() => setExtendOpen(true)}
        />
        <ActionTile
          disabled={!active}
          title="Pesan F&B"
          icon={Coffee}
          tone="orange"
          onClick={() => setFnbOpen(true)}
        />
        <ActionTile
          disabled={!active}
          title="Tambah Add-on"
          icon={PlusCircle}
          tone="emerald"
          onClick={() => setAddonOpen(true)}
        />
        <ActionTile
          disabled={!active}
          title="Akhiri Sesi"
          icon={ReceiptText}
          tone="slate"
          onClick={() => {
            if (!onComplete) return;
            openConfirm({
              kind: "complete",
              title: "Akhiri sesi",
              description: "Sesi akan ditutup dan pelunasan akan mengikuti status tagihan booking.",
              confirmLabel: "Akhiri sesi",
              tone: "slate",
              action: async () => {
                await onComplete();
              },
            });
          }}
          filled
        />
      </div>

      <MobileSheet
        open={extendOpen}
        onClose={() => setExtendOpen(false)}
        title="Tambah durasi sesi"
        eyebrow="Live Action"
      >
        <div className="space-y-4 p-4">
          <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
            Pilih tambahan durasi. Sistem akan langsung menambah billing booking customer.
          </div>
          <div className="grid grid-cols-2 gap-3">
            {extOptions.map((count) => {
              const total = (Number(booking?.unit_price || 0) || 0) * count;
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => setSelectedExtend(count)}
                  className={cn(
                    "rounded-[1.25rem] border px-4 py-4 text-left",
                    selectedExtend === count
                      ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10"
                      : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]",
                  )}
                >
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">
                    +{count} {unitDuration === 60 ? "jam" : "sesi"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Rp {formatIDR(total)}
                  </p>
                </button>
              );
            })}
          </div>
          <Button
            className="h-12 w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-500"
            onClick={() => {
              openConfirm({
                kind: "extend",
                title: "Konfirmasi tambah durasi",
                description: `Tambah ${selectedExtend} ${unitDuration === 60 ? "jam" : "sesi"} dan update billing booking sekarang.`,
                confirmLabel: "Tambah durasi",
                tone: "blue",
                action: async () => {
                  await onExtend(selectedExtend);
                  setExtendError(null);
                  setExtendOpen(false);
                },
              });
            }}
          >
            Konfirmasi tambah durasi
          </Button>
        </div>
      </MobileSheet>

      <CatalogSheet
        open={fnbOpen}
        onClose={() => setFnbOpen(false)}
        eyebrow="Live Action"
        title="Pesan F&B"
        items={filteredMenu}
        search={menuSearch}
        setSearch={setMenuSearch}
        cart={menuCart}
        setCart={setMenuCart}
        emptyLabel="Belum ada item yang cocok dengan pencarian."
        total={menuTotal}
        totalLabel="Total pesanan"
        actionLabel="Kirim pesanan"
        accent="orange"
        onSubmit={async () => {
          openConfirm({
            kind: "fnb",
            title: "Kirim pesanan F&B",
            description: `${menuItemsInCart.length} item akan masuk ke booking dengan total Rp ${formatIDR(menuTotal)}.`,
            confirmLabel: "Kirim pesanan",
            tone: "orange",
            action: async () => {
              await onOrderFnb(menuItemsInCart);
              setMenuCart({});
              setMenuSearch("");
              setFnbOpen(false);
            },
          });
        }}
      />

      <CatalogSheet
        open={addonOpen}
        onClose={() => setAddonOpen(false)}
        eyebrow="Live Action"
        title="Tambah add-on"
        items={filteredAddons}
        search={addonSearch}
        setSearch={setAddonSearch}
        cart={addonCart}
        setCart={setAddonCart}
        emptyLabel="Belum ada add-on yang cocok dengan pencarian."
        total={addonTotal}
        totalLabel="Total add-on"
        actionLabel="Simpan add-on"
        accent="emerald"
        onSubmit={async () => {
          openConfirm({
            kind: "addon",
            title: "Tambahkan add-on",
            description: `${addonItemsInCart.length} item add-on akan ditambahkan ke booking dengan total Rp ${formatIDR(addonTotal)}.`,
            confirmLabel: "Tambahkan",
            tone: "emerald",
            action: async () => {
              await onOrderAddon(addonItemsInCart);
              setAddonCart({});
              setAddonSearch("");
              setAddonOpen(false);
            },
          });
        }}
      />

      <ConfirmSheet
        open={Boolean(confirmState)}
        onClose={() => {
          if (submitting) return;
          setConfirmState(null);
        }}
        title={confirmState?.title || ""}
        description={confirmState?.description || ""}
        confirmLabel={confirmState?.confirmLabel || "Lanjutkan"}
        tone={confirmState?.tone || "slate"}
        submitting={submitting}
        onConfirm={runConfirmedAction}
      />
    </div>
  );
}

function ConfirmSheet({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  tone,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  tone: "blue" | "orange" | "emerald" | "slate";
  submitting: boolean;
  onConfirm: () => Promise<void>;
}) {
  return (
    <MobileSheet open={open} onClose={onClose} title={title} eyebrow="Konfirmasi">
      <div className="space-y-4 p-4">
          <div
            className={cn(
              "rounded-[1.25rem] border px-4 py-3 text-sm leading-6",
              tone === "blue" && "border-blue-100 bg-blue-50 text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100",
              tone === "orange" && "border-orange-100 bg-orange-50 text-orange-900 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-100",
              tone === "emerald" && "border-emerald-100 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100",
              tone === "slate" && "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200",
            )}
          >
            {description}
          </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-2xl"
            onClick={onClose}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button
            type="button"
            className={cn(
              "h-12 rounded-2xl text-white",
              tone === "blue" && "bg-blue-600 hover:bg-blue-500",
              tone === "orange" && "bg-orange-500 hover:bg-orange-400",
              tone === "emerald" && "bg-emerald-600 hover:bg-emerald-500",
              tone === "slate" && "bg-slate-950 hover:bg-slate-800 dark:bg-white dark:text-slate-950",
            )}
            onClick={() => void onConfirm()}
            disabled={submitting}
          >
            {submitting ? "Memproses..." : confirmLabel}
          </Button>
        </div>
      </div>
    </MobileSheet>
  );
}

function ActionTile({
  title,
  icon: Icon,
  tone,
  disabled,
  filled,
  onClick,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "blue" | "orange" | "emerald" | "slate";
  disabled?: boolean;
  filled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      disabled={disabled}
      variant="outline"
      onClick={onClick}
      className={cn(
        "h-auto min-h-[82px] flex-col items-start justify-between rounded-[1.25rem] px-3 py-3 text-left",
        filled
          ? "border-slate-950 bg-slate-950 text-white hover:bg-slate-800 dark:border-white dark:bg-white dark:text-slate-950"
          : "border-slate-200 bg-white text-slate-950 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:bg-white/[0.06]",
      )}
    >
      <div
        className={cn(
          "mb-3 flex h-9 w-9 items-center justify-center rounded-xl",
          !filled && tone === "blue" && "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
          !filled && tone === "orange" && "bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300",
          !filled && tone === "emerald" && "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
          filled
            ? "bg-white/10 text-white dark:bg-slate-950/10 dark:text-slate-950"
            : tone === "slate" && "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm font-semibold">{title}</span>
    </Button>
  );
}

function CatalogSheet({
  open,
  onClose,
  eyebrow,
  title,
  items,
  search,
  setSearch,
  cart,
  setCart,
  emptyLabel,
  total,
  totalLabel,
  actionLabel,
  accent,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  items: CatalogItem[];
  search: string;
  setSearch: (value: string) => void;
  cart: Record<string, CatalogItem & { quantity: number }>;
  setCart: React.Dispatch<
    React.SetStateAction<Record<string, CatalogItem & { quantity: number }>>
  >;
  emptyLabel: string;
  total: number;
  totalLabel: string;
  actionLabel: string;
  accent: "orange" | "emerald";
  onSubmit: () => Promise<void>;
}) {
  const cartItems = Object.values(cart);
  const formatIDR = (value: number) =>
    new Intl.NumberFormat("id-ID").format(Number(value || 0));

  const add = (item: CatalogItem) => {
    setCart((prev) => ({
      ...prev,
      [item.id]: { ...item, quantity: (prev[item.id]?.quantity || 0) + 1 },
    }));
  };

  const remove = (id: string) => {
    setCart((prev) => {
      const next = { ...prev };
      if (!next[id]) return prev;
      if (next[id].quantity > 1) next[id].quantity -= 1;
      else delete next[id];
      return next;
    });
  };

  return (
    <MobileSheet open={open} onClose={onClose} title={title} eyebrow={eyebrow}>
      <div className="space-y-4 p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari item..."
            className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-11 dark:border-white/10 dark:bg-white/[0.04]"
          />
        </div>

        <div className="max-h-[46vh] space-y-3 overflow-y-auto pr-1">
          {items.length ? (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.25rem] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {item.category || (accent === "orange" ? "Menu tenant" : "Add-on resource")}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 text-sm font-semibold",
                      accent === "orange" ? "text-orange-500" : "text-emerald-600",
                    )}
                  >
                    Rp {formatIDR(Number(item.price || item.unit_price || 0))}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <Badge
                    className={cn(
                      "rounded-full border-none",
                      accent === "orange"
                        ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-200"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200",
                    )}
                  >
                    {cart[item.id]?.quantity || 0} dipilih
                  </Badge>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => add(item)}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl text-white",
                        accent === "orange" ? "bg-orange-500" : "bg-emerald-600",
                      )}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
              {emptyLabel}
            </div>
          )}
        </div>

        {cartItems.length ? (
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">{totalLabel}</span>
              <span className="font-semibold text-slate-950 dark:text-white">
                Rp {formatIDR(total)}
              </span>
            </div>
          </div>
        ) : null}

        <Button
          disabled={cartItems.length === 0}
          className={cn(
            "h-12 w-full rounded-2xl text-white",
            accent === "orange" ? "bg-orange-500 hover:bg-orange-400" : "bg-emerald-600 hover:bg-emerald-500",
          )}
          onClick={onSubmit}
        >
          {actionLabel}
        </Button>
      </div>
    </MobileSheet>
  );
}
