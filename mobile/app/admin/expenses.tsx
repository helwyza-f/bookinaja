import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CenterModal } from "@/components/center-modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { CtaButton } from "@/components/cta-button";
import { Field } from "@/components/field";
import { ScreenShell } from "@/components/screen-shell";
import { StatTile } from "@/components/stat-tile";
import { EmptyStateCard, FilterChip, SectionHeader } from "@/components/admin-primitives";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useAdminIdentity } from "@/hooks/use-admin-identity";
import { useToast } from "@/hooks/use-toast";
import { hasAdminPermission } from "@/lib/admin-access";
import { formatCurrency } from "@/lib/format";
import { pickAndUploadImage } from "@/lib/media-upload";

type ExpenseRow = {
  id: string;
  title?: string;
  category?: string;
  vendor?: string;
  amount?: number;
  expense_date?: string;
  payment_method?: string;
  notes?: string;
  receipt_url?: string;
};

type ExpenseSummary = {
  total?: number;
  entries?: number;
};

type ExpenseFormState = {
  title: string;
  category: string;
  amount: string;
  expenseDate: string;
  paymentMethod: string;
  vendor: string;
  notes: string;
  receiptUrl: string;
};

const emptyForm: ExpenseFormState = {
  title: "",
  category: "Operasional",
  amount: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  paymentMethod: "Cash",
  vendor: "",
  notes: "",
  receiptUrl: "",
};

const categoryOptions = ["Operasional", "Gaji", "Marketing", "Maintenance", "Inventory", "Lainnya"] as const;

function formatAmount(value?: number) {
  const formatted = formatCurrency(value || 0);
  return formatted === "Cek harga" ? "Rp 0" : formatted;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(parsed);
}

export default function AdminExpensesScreen() {
  const guard = useAuthGuard("admin");
  const identity = useAdminIdentity();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseRow | null>(null);
  const [form, setForm] = useState<ExpenseFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingItem, setDeletingItem] = useState<ExpenseRow | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const canCreate = hasAdminPermission(identity.data, "expenses.create");
  const canUpdate = hasAdminPermission(identity.data, "expenses.update");
  const canDelete = hasAdminPermission(identity.data, "expenses.delete");

  const query = useQuery({
    queryKey: ["admin-mobile-expenses"],
    enabled: guard.ready,
    queryFn: async () => {
      const [list, summary] = await Promise.all([
        apiFetch<ExpenseRow[]>("/expenses?limit=20", { audience: "admin" }),
        apiFetch<ExpenseSummary>("/expenses/summary", { audience: "admin" }),
      ]);
      return { list, summary };
    },
  });

  const items = query.data?.list || [];
  const summary = query.data?.summary || {};
  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.title, item.category, item.vendor, item.notes].join(" ").toLowerCase().includes(needle),
    );
  }, [items, search]);
  const categories = useMemo(() => new Set(items.map((item) => item.category).filter(Boolean)).size, [items]);

  function openCreate() {
    setEditingItem(null);
    setForm(emptyForm);
    setEditorOpen(true);
  }

  function openEdit(item: ExpenseRow) {
    setEditingItem(item);
    setForm({
      title: item.title || "",
      category: item.category || "",
      amount: String(Math.round(Number(item.amount || 0))),
      expenseDate: String(item.expense_date || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
      paymentMethod: item.payment_method || "",
      vendor: item.vendor || "",
      notes: item.notes || "",
      receiptUrl: item.receipt_url || "",
    });
    setEditorOpen(true);
  }

  function closeEditor() {
    if (submitting) return;
    setEditorOpen(false);
    setEditingItem(null);
    setForm(emptyForm);
  }

  async function refetchExpenses() {
    await queryClient.invalidateQueries({ queryKey: ["admin-mobile-expenses"] });
  }

  async function submitForm() {
    if (!canCreate && !editingItem) return;
    if (!canUpdate && editingItem) return;
    if (!form.title.trim()) {
      showToast({ title: "Judul wajib", message: "Isi nama pengeluaran dulu.", tone: "warning" });
      return;
    }
    const amount = Number(form.amount.replace(/[^\d]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast({ title: "Nominal belum valid", message: "Isi jumlah pengeluaran dengan benar.", tone: "warning" });
      return;
    }
    if (!form.expenseDate.trim()) {
      showToast({ title: "Tanggal wajib", message: "Isi tanggal pengeluaran dulu.", tone: "warning" });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: form.title.trim(),
        category: form.category.trim() || "Operasional",
        amount,
        expense_date: form.expenseDate.trim(),
        payment_method: form.paymentMethod.trim() || "Cash",
        vendor: form.vendor.trim(),
        notes: form.notes.trim(),
        receipt_url: form.receiptUrl.trim(),
      };
      if (editingItem?.id) {
        await apiFetch(`/expenses/${editingItem.id}`, {
          audience: "admin",
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/expenses", {
          audience: "admin",
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      await refetchExpenses();
      closeEditor();
      showToast({
        title: editingItem ? "Expense diupdate" : "Expense ditambah",
        message: editingItem ? "Perubahan pengeluaran sudah disimpan." : "Pengeluaran baru sudah tercatat.",
        tone: "success",
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal simpan",
        message: err.message || "Pengeluaran belum berhasil disimpan.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteItem() {
    if (!deletingItem?.id || !canDelete) return;
    try {
      setSubmitting(true);
      await apiFetch(`/expenses/${deletingItem.id}`, {
        audience: "admin",
        method: "DELETE",
      });
      await refetchExpenses();
      setDeletingItem(null);
      showToast({
        title: "Expense dihapus",
        message: "Entry biaya sudah dikeluarkan dari catatan.",
        tone: "success",
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal hapus",
        message: err.message || "Pengeluaran belum berhasil dihapus.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadReceipt() {
    try {
      setUploadingReceipt(true);
      const uploaded = await pickAndUploadImage({
        endpoint: "/expenses/upload-receipt",
        audience: "admin",
      });
      if (!uploaded?.url) return;
      setForm((current) => ({ ...current, receiptUrl: uploaded.url }));
      showToast({
        title: "Struk siap",
        message: "Foto struk berhasil diupload.",
        tone: "success",
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Upload gagal",
        message: err.message || "Foto struk belum berhasil diupload.",
        tone: "error",
      });
    } finally {
      setUploadingReceipt(false);
    }
  }

  return (
    <ScreenShell
      eyebrow="Operations"
      title="Expenses"
      description="Input dan rapikan biaya operasional langsung dari mobile."
    >
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/admin/operations"))}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <MaterialCommunityIcons name="chevron-left" size={16} color="#64748b" />
          <Text selectable style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>
            Kembali
          </Text>
        </View>
      </Pressable>

      <CardBlock>
        <SectionHeader
          title="Expense snapshot"
          description="Pantau total biaya dan lanjut cepat ke editor entry."
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatTile label="Total" value={formatAmount(summary.total)} hint="Akumulasi periode aktif" tone="violet" />
          <StatTile label="Entries" value={String(Number(summary.entries || 0))} hint="Jumlah transaksi biaya" tone="blue" />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatTile label="Kategori" value={String(categories)} hint="Kategori yang muncul" tone="emerald" />
          <StatTile label="Terbaru" value={items[0] ? formatDate(items[0].expense_date) : "-"} hint="Entry paling baru" tone="amber" />
        </View>
      </CardBlock>

      <CardBlock>
        <View style={{ gap: 12 }}>
          <SectionHeader
            title="Cari dan filter"
            description="Filter cepat per title, vendor, atau kategori biaya."
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari title, vendor, kategori"
            placeholderTextColor="#94a3b8"
            style={inputStyle}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <FilterChip label="Semua" active={!search.trim()} onPress={() => setSearch("")} />
            {categoryOptions.map((option) => (
              <FilterChip
                key={option}
                label={option}
                active={search.trim().toLowerCase() === option.toLowerCase()}
                onPress={() => setSearch(option)}
              />
            ))}
          </View>
          {canCreate ? <CtaButton label="Tambah expense" onPress={openCreate} /> : null}
        </View>
      </CardBlock>

      {filteredItems.map((item) => (
        <Pressable key={item.id} disabled={!canUpdate} onPress={() => openEdit(item)}>
          <CardBlock>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
                  {item.title || "Expense"}
                </Text>
                <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                  {item.category || "Tanpa kategori"}
                  {item.vendor ? ` / ${item.vendor}` : ""}
                </Text>
              </View>
              <Text selectable style={{ color: "#7c3aed", fontSize: 13, fontWeight: "900" }}>
                {formatAmount(item.amount)}
              </Text>
            </View>

            <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
              {formatDate(item.expense_date)}
              {item.payment_method ? ` / ${item.payment_method}` : ""}
            </Text>

            {item.notes ? (
              <Text selectable style={{ color: "#475569", fontSize: 13, lineHeight: 20 }}>
                {item.notes}
              </Text>
            ) : null}

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
              {canUpdate ? <MiniAction label="Edit" icon="square-edit-outline" onPress={() => openEdit(item)} /> : null}
              {canDelete ? (
                <MiniAction
                  label="Hapus"
                  icon="trash-can-outline"
                  tone="danger"
                  onPress={() => setDeletingItem(item)}
                />
              ) : null}
            </View>
          </CardBlock>
        </Pressable>
      ))}

      {!query.isLoading && !filteredItems.length ? (
        <EmptyStateCard
          title="Expense belum ketemu"
          description="Belum ada entry pengeluaran yang cocok dengan pencarian ini."
        />
      ) : null}

      <CenterModal
        open={editorOpen}
        title={editingItem ? "Edit expense" : "Tambah expense"}
        message="Catat biaya operasional tanpa pindah ke dashboard web."
        onClose={closeEditor}
        footer={
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <CtaButton tone="secondary" label="Tutup" onPress={closeEditor} disabled={submitting} />
            </View>
            <View style={{ flex: 1 }}>
              <CtaButton
                label={submitting ? "Menyimpan..." : editingItem ? "Simpan" : "Tambah"}
                onPress={() => void submitForm()}
                disabled={submitting}
              />
            </View>
          </View>
        }
      >
        <View style={{ gap: 12 }}>
          <Field
            label="Judul expense"
            value={form.title}
            onChangeText={(value) => setForm((current) => ({ ...current, title: value }))}
            placeholder="Contoh: Beli stok minuman"
          />
          <SectionHeader title="Kategori" description="Kelompokkan expense supaya laporan tetap terbaca." />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {categoryOptions.map((option) => {
              const active = form.category === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setForm((current) => ({ ...current, category: option }))}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? "#2563eb" : "#dbe2ea",
                    backgroundColor: active ? "#eff6ff" : "#ffffff",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text selectable style={{ color: active ? "#1d4ed8" : "#475569", fontSize: 12, fontWeight: "800" }}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Field
            label="Nominal"
            value={form.amount}
            onChangeText={(value) => setForm((current) => ({ ...current, amount: value.replace(/[^\d]/g, "") }))}
            placeholder="50000"
            keyboardType="number-pad"
          />
          <Field
            label="Tanggal"
            value={form.expenseDate}
            onChangeText={(value) => setForm((current) => ({ ...current, expenseDate: value }))}
            placeholder="YYYY-MM-DD"
          />
          <Field
            label="Metode bayar"
            value={form.paymentMethod}
            onChangeText={(value) => setForm((current) => ({ ...current, paymentMethod: value }))}
            placeholder="Cash / Transfer / QRIS"
          />
          <Field
            label="Vendor"
            value={form.vendor}
            onChangeText={(value) => setForm((current) => ({ ...current, vendor: value }))}
            placeholder="Nama toko atau supplier"
          />
          <View
            style={{
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "#dbe2ea",
              backgroundColor: "#fbfdff",
              paddingHorizontal: 14,
              paddingVertical: 14,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "800" }}>
                  Foto struk
                </Text>
                <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                  {form.receiptUrl ? "Bukti transaksi sudah terpasang." : "Upload struk dari galeri."}
                </Text>
              </View>
              <View style={{ width: 120 }}>
                <CtaButton
                  tone="secondary"
                  label={uploadingReceipt ? "Upload..." : form.receiptUrl ? "Ganti struk" : "Upload struk"}
                  onPress={() => void handleUploadReceipt()}
                  disabled={uploadingReceipt || submitting}
                />
              </View>
            </View>
            {form.receiptUrl ? (
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <Text selectable numberOfLines={1} style={{ flex: 1, color: "#2563eb", fontSize: 12, fontWeight: "700" }}>
                  Bukti siap
                </Text>
                <Pressable onPress={() => setForm((current) => ({ ...current, receiptUrl: "" }))}>
                  <Text selectable style={{ color: "#dc2626", fontSize: 12, fontWeight: "800" }}>
                    Hapus struk
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
          <Field
            label="Catatan"
            value={form.notes}
            onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))}
            placeholder="Catatan singkat untuk tim"
            multiline
          />
        </View>
      </CenterModal>

      <ConfirmModal
        open={Boolean(deletingItem)}
        title="Hapus expense ini?"
        message="Entry biaya akan dikeluarkan dari catatan tenant."
        confirmLabel="Hapus"
        tone="danger"
        busy={submitting}
        onCancel={() => setDeletingItem(null)}
        onConfirm={() => void deleteItem()}
      />
    </ScreenShell>
  );
}

function MiniAction({
  label,
  icon,
  tone = "default",
  onPress,
}: {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tone?: "default" | "danger";
  onPress: () => void;
}) {
  const danger = tone === "danger";
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: danger ? "#fecaca" : "#dbe2ea",
        backgroundColor: danger ? "#fff1f2" : "#ffffff",
        paddingHorizontal: 10,
        paddingVertical: 8,
      }}
    >
      <MaterialCommunityIcons name={icon} size={15} color={danger ? "#dc2626" : "#2563eb"} />
      <Text selectable style={{ color: danger ? "#dc2626" : "#334155", fontSize: 12, fontWeight: "800" }}>
        {label}
      </Text>
    </Pressable>
  );
}

const inputStyle = {
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "#d7dfeb",
  backgroundColor: "#fbfcff",
  paddingHorizontal: 14,
  paddingVertical: 14,
  color: "#0f172a",
  fontSize: 15,
} as const;
