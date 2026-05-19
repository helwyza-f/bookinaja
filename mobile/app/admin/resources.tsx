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
import { EmptyStateCard, SectionHeader, StatusPill as TonePill } from "@/components/admin-primitives";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useAdminIdentity } from "@/hooks/use-admin-identity";
import { useToast } from "@/hooks/use-toast";
import { hasAdminPermission } from "@/lib/admin-access";

type ResourceRow = {
  id: string;
  name?: string;
  category?: string;
  status?: string;
  operating_mode?: string;
  description?: string;
  image_url?: string;
  main_option_count?: number;
  addon_count?: number;
};

type ResourceFormState = {
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  operatingMode: "timed" | "direct_sale";
};

const emptyForm: ResourceFormState = {
  name: "",
  category: "",
  description: "",
  imageUrl: "",
  operatingMode: "timed",
};

export default function AdminResourcesScreen() {
  const guard = useAuthGuard("admin");
  const identity = useAdminIdentity();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<ResourceFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingItem, setDeletingItem] = useState<ResourceRow | null>(null);

  const canCreate = hasAdminPermission(identity.data, "resources.create");
  const canUpdate = hasAdminPermission(identity.data, "resources.update");
  const canDelete = hasAdminPermission(identity.data, "resources.delete");

  const query = useQuery({
    queryKey: ["admin-mobile-resources"],
    enabled: guard.ready,
    queryFn: () => apiFetch<{ items?: ResourceRow[] }>("/admin/resources/list", { audience: "admin" }),
  });

  const items = query.data?.items || [];
  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.name, item.category, item.status, item.operating_mode].join(" ").toLowerCase().includes(needle),
    );
  }, [items, search]);

  const summary = useMemo(() => {
    return {
      available: items.filter((item) => String(item.status || "").toLowerCase() === "available").length,
      busy: items.filter((item) => ["occupied", "busy"].includes(String(item.status || "").toLowerCase())).length,
      hybrid: items.filter((item) => String(item.operating_mode || "").toLowerCase() === "hybrid").length,
    };
  }, [items]);

  function closeCreate() {
    if (submitting) return;
    setCreateOpen(false);
    setForm(emptyForm);
  }

  async function refetchResources() {
    await queryClient.invalidateQueries({ queryKey: ["admin-mobile-resources"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-dashboard-mobile"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-mobile-booking-manual-setup"] });
  }

  async function submitCreate() {
    if (!canCreate) return;
    if (!form.name.trim()) {
      showToast({ title: "Nama wajib", message: "Isi nama resource dulu.", tone: "warning" });
      return;
    }

    try {
      setSubmitting(true);
      await apiFetch("/resources-all", {
        audience: "admin",
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim().toUpperCase(),
          category: form.category.trim().toUpperCase(),
          description: form.description.trim(),
          image_url: form.imageUrl.trim(),
          operating_mode: form.operatingMode,
        }),
      });
      await refetchResources();
      closeCreate();
      showToast({
        title: "Resource ditambah",
        message: "Unit baru sudah masuk tenant.",
        tone: "success",
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal simpan",
        message: err.message || "Resource belum berhasil dibuat.",
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
      await apiFetch(`/resources-all/${deletingItem.id}`, {
        audience: "admin",
        method: "DELETE",
      });
      await refetchResources();
      setDeletingItem(null);
      showToast({
        title: "Resource dihapus",
        message: "Unit sudah keluar dari tenant.",
        tone: "success",
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal hapus",
        message: err.message || "Resource belum berhasil dihapus.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenShell
      eyebrow="Operations"
      title="Resources"
      description="Overview resource ada di sini, detail pricing dan add-on dikelola per unit."
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
          title="Resource snapshot"
          description="Pantau unit aktif dan lompat cepat ke detail pricing per resource."
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatTile label="Total" value={String(items.length)} hint="Semua resource tenant" tone="blue" />
          <StatTile label="Available" value={String(summary.available)} hint="Siap dipakai" tone="emerald" />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatTile label="Busy" value={String(summary.busy)} hint="Sedang berjalan" tone="amber" />
          <StatTile label="Hybrid" value={String(summary.hybrid)} hint="Booking + direct sale" tone="violet" />
        </View>
      </CardBlock>

      <CardBlock>
        <View style={{ gap: 12 }}>
          <SectionHeader
            title="Cari dan kelola"
            description="Tambah unit baru atau buka detail resource yang sudah ada."
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari nama, kategori, mode"
            placeholderTextColor="#94a3b8"
            style={inputStyle}
          />
          {canCreate ? <CtaButton label="Tambah resource" onPress={() => setCreateOpen(true)} /> : null}
        </View>
      </CardBlock>

      {filteredItems.map((item) => (
        <Pressable
          key={item.id}
          onPress={() =>
            router.push({
              pathname: "/admin/resources/[id]",
              params: { id: item.id },
            })
          }
        >
          <CardBlock>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
                  {item.name || "Resource"}
                </Text>
                <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                  {item.category || "Kategori belum diisi"}
                </Text>
              </View>
              <StatusPill value={item.status} />
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <MetaBox label="Mode" value={formatMode(item.operating_mode)} />
              <MetaBox label="Paket" value={String(Number(item.main_option_count || 0))} />
              <MetaBox label="Addon" value={String(Number(item.addon_count || 0))} />
            </View>

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
              {canUpdate ? (
                <MiniAction
                  label="Manage"
                  icon="cog-outline"
                  onPress={() =>
                    router.push({
                      pathname: "/admin/resources/[id]",
                      params: { id: item.id },
                    })
                  }
                />
              ) : null}
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
          title="Resource belum ketemu"
          description="Belum ada resource yang cocok dengan pencarian ini."
        />
      ) : null}

      <CenterModal
        open={createOpen}
        title="Tambah resource"
        message="Daftarkan unit baru, lalu lanjut kelola paket dan add-on di halaman detailnya."
        onClose={closeCreate}
        footer={
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <CtaButton tone="secondary" label="Tutup" onPress={closeCreate} disabled={submitting} />
            </View>
            <View style={{ flex: 1 }}>
              <CtaButton
                label={submitting ? "Menyimpan..." : "Tambah"}
                onPress={() => void submitCreate()}
                disabled={submitting}
              />
            </View>
          </View>
        }
      >
        <View style={{ gap: 12 }}>
          <Field
            label="Nama resource"
            value={form.name}
            onChangeText={(value) => setForm((current) => ({ ...current, name: value.toUpperCase() }))}
            placeholder="Contoh: PC REGULER 01"
          />
          <Field
            label="Kategori"
            value={form.category}
            onChangeText={(value) => setForm((current) => ({ ...current, category: value.toUpperCase() }))}
            placeholder="Contoh: PC / PS / ROOM"
          />
          <SectionHeader title="Mode operasional" description="Pilih perilaku dasar unit ini di booking dan ops." />
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { value: "timed" as const, label: "Timed" },
              { value: "direct_sale" as const, label: "Direct sale" },
            ].map((option) => {
              const active = form.operatingMode === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setForm((current) => ({ ...current, operatingMode: option.value }))}
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: active ? "#2563eb" : "#dbe2ea",
                    backgroundColor: active ? "#eff6ff" : "#ffffff",
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                  }}
                >
                  <Text selectable style={{ color: active ? "#1d4ed8" : "#0f172a", fontSize: 12, fontWeight: "800", textAlign: "center" }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Field
            label="Deskripsi"
            value={form.description}
            onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
            placeholder="Catatan singkat untuk tim"
            multiline
          />
          <Field
            label="Cover image URL"
            hint="Opsional"
            value={form.imageUrl}
            onChangeText={(value) => setForm((current) => ({ ...current, imageUrl: value }))}
            placeholder="https://..."
            autoCapitalize="none"
          />
        </View>
      </CenterModal>

      <ConfirmModal
        open={Boolean(deletingItem)}
        title="Hapus resource ini?"
        message="Unit dan item terkait akan keluar dari tenant."
        confirmLabel="Hapus"
        tone="danger"
        busy={submitting}
        onCancel={() => setDeletingItem(null)}
        onConfirm={() => void deleteItem()}
      />
    </ScreenShell>
  );
}

function StatusPill({ value }: { value?: string }) {
  const normalized = String(value || "unknown").toLowerCase();
  const meta =
    normalized === "available" ? { label: "Available", tone: "success" as const }
    : ["occupied", "busy"].includes(normalized) ? { label: "Busy", tone: "amber" as const }
    : normalized === "maintenance" ? { label: "Maintenance", tone: "danger" as const }
    : { label: "Unknown", tone: "slate" as const };

  return <TonePill label={meta.label} tone={meta.tone} />;
}

function MetaBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingVertical: 12, gap: 3 }}>
      <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
        {label.toUpperCase()}
      </Text>
      <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "800" }}>
        {value}
      </Text>
    </View>
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

function formatMode(value?: string) {
  const mode = String(value || "timed").toLowerCase();
  if (mode === "direct_sale") return "Direct sale";
  if (mode === "hybrid") return "Hybrid";
  return "Timed";
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
