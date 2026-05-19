import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image, Pressable, Text, TextInput, View } from "react-native";
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
import { EmptyStateCard, FilterChip, SectionHeader, StatusPill } from "@/components/admin-primitives";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useAdminIdentity } from "@/hooks/use-admin-identity";
import { useToast } from "@/hooks/use-toast";
import { hasAdminPermission } from "@/lib/admin-access";
import { formatCurrency } from "@/lib/format";
import { pickAndUploadImage } from "@/lib/media-upload";

type FnbItem = {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  image_url?: string | null;
  is_available?: boolean;
};

type MenuFormState = {
  name: string;
  description: string;
  category: string;
  price: string;
  imageUrl: string;
  isAvailable: boolean;
};

const emptyForm: MenuFormState = {
  name: "",
  description: "",
  category: "Food",
  price: "",
  imageUrl: "",
  isAvailable: true,
};

const categoryOptions = ["Food", "Drink", "Snack"] as const;

function formatAmount(value?: number) {
  const formatted = formatCurrency(value || 0);
  return formatted === "Cek harga" ? "Rp 0" : formatted;
}

export default function AdminMenuScreen() {
  const guard = useAuthGuard("admin");
  const identity = useAdminIdentity();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FnbItem | null>(null);
  const [form, setForm] = useState<MenuFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingItem, setDeletingItem] = useState<FnbItem | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const canCreate = hasAdminPermission(identity.data, "fnb.create");
  const canUpdate = hasAdminPermission(identity.data, "fnb.update");
  const canDelete = hasAdminPermission(identity.data, "fnb.delete");

  const query = useQuery({
    queryKey: ["admin-mobile-fnb"],
    enabled: guard.ready,
    queryFn: () => apiFetch<FnbItem[]>("/fnb", { audience: "admin" }),
  });

  const items = query.data || [];
  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.name, item.category, item.description].join(" ").toLowerCase().includes(needle),
    );
  }, [items, search]);

  const stats = useMemo(() => {
    return {
      ready: items.filter((item) => item.is_available !== false).length,
      unavailable: items.filter((item) => item.is_available === false).length,
      categories: new Set(items.map((item) => item.category).filter(Boolean)).size,
    };
  }, [items]);

  function openCreate() {
    setEditingItem(null);
    setForm(emptyForm);
    setEditorOpen(true);
  }

  function openEdit(item: FnbItem) {
    setEditingItem(item);
    setForm({
      name: item.name || "",
      description: item.description || "",
      category: item.category || "",
      price: String(Math.round(Number(item.price || 0))),
      imageUrl: item.image_url || "",
      isAvailable: item.is_available !== false,
    });
    setEditorOpen(true);
  }

  function closeEditor() {
    if (submitting) return;
    setEditorOpen(false);
    setEditingItem(null);
    setForm(emptyForm);
  }

  async function refetchMenu() {
    await queryClient.invalidateQueries({ queryKey: ["admin-mobile-fnb"] });
  }

  async function submitForm() {
    if (!canCreate && !editingItem) return;
    if (!canUpdate && editingItem) return;

    if (!form.name.trim()) {
      showToast({ title: "Nama wajib", message: "Isi nama menu dulu.", tone: "warning" });
      return;
    }

    const price = Number(form.price.replace(/[^\d]/g, ""));
    if (!Number.isFinite(price) || price <= 0) {
      showToast({ title: "Harga belum valid", message: "Isi harga menu dengan benar.", tone: "warning" });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim() || "Food",
        price,
        image_url: form.imageUrl.trim() || null,
        is_available: form.isAvailable,
      };
      if (editingItem?.id) {
        await apiFetch(`/fnb/${editingItem.id}`, {
          audience: "admin",
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/fnb", {
          audience: "admin",
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      await refetchMenu();
      closeEditor();
      showToast({
        title: editingItem ? "Menu diupdate" : "Menu ditambah",
        message: editingItem ? "Perubahan menu sudah tersimpan." : "Menu baru sudah masuk katalog.",
        tone: "success",
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal simpan",
        message: err.message || "Perubahan menu belum berhasil disimpan.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleAvailability(item: FnbItem) {
    if (!canUpdate) return;
    try {
      await apiFetch(`/fnb/${item.id}`, {
        audience: "admin",
        method: "PUT",
        body: JSON.stringify({
          name: item.name || "",
          description: item.description || "",
          category: item.category || "",
          price: Number(item.price || 0),
          image_url: item.image_url || null,
          is_available: item.is_available === false,
        }),
      });
      await refetchMenu();
      showToast({
        title: item.is_available === false ? "Menu ready" : "Menu disetop",
        message: item.is_available === false ? "Item kembali bisa dijual." : "Item disembunyikan dari jual cepat.",
        tone: "success",
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal ubah status",
        message: err.message || "Status menu belum berhasil diubah.",
        tone: "error",
      });
    }
  }

  async function deleteItem() {
    if (!deletingItem?.id || !canDelete) return;
    try {
      setSubmitting(true);
      await apiFetch(`/fnb/${deletingItem.id}`, {
        audience: "admin",
        method: "DELETE",
      });
      await refetchMenu();
      setDeletingItem(null);
      showToast({
        title: "Menu dihapus",
        message: "Item sudah keluar dari katalog tenant.",
        tone: "success",
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal hapus",
        message: err.message || "Menu belum berhasil dihapus.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadImage() {
    try {
      setUploadingImage(true);
      const uploaded = await pickAndUploadImage({
        endpoint: "/fnb/upload",
        audience: "admin",
      });
      if (!uploaded?.url) return;
      setForm((current) => ({ ...current, imageUrl: uploaded.url }));
      showToast({
        title: "Foto siap",
        message: "Gambar menu berhasil diupload.",
        tone: "success",
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Upload gagal",
        message: err.message || "Foto menu belum berhasil diupload.",
        tone: "error",
      });
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <ScreenShell
      eyebrow="Operations"
      title="Menu F&B"
      description="Kelola item jual tenant langsung dari admin mobile."
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
          title="Katalog snapshot"
          description="Pantau item aktif, stok siap jual, dan density kategori tenant."
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatTile label="Total item" value={String(items.length)} hint="Katalog tenant" tone="blue" />
          <StatTile label="Ready" value={String(stats.ready)} hint="Siap dijual sekarang" tone="emerald" />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatTile label="Kosong" value={String(stats.unavailable)} hint="Sedang disetop" tone="amber" />
          <StatTile label="Kategori" value={String(stats.categories)} hint="Kelompok menu aktif" tone="violet" />
        </View>
      </CardBlock>

      <CardBlock>
        <View style={{ gap: 12 }}>
          <SectionHeader
            title="Cari dan filter"
            description="Filter cepat per kategori lalu buka editor item."
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari menu atau kategori"
            placeholderTextColor="#94a3b8"
            style={inputStyle}
          />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <FilterChip
              label="Semua"
              active={!search.trim()}
              onPress={() => setSearch("")}
            />
            {categoryOptions.map((category) => (
              <FilterChip
                key={category}
                label={category}
                active={search.trim().toLowerCase() === category.toLowerCase()}
                onPress={() => setSearch(category)}
              />
            ))}
          </View>
          {canCreate ? <CtaButton label="Tambah menu" onPress={openCreate} /> : null}
        </View>
      </CardBlock>

      {filteredItems.map((item) => (
        <Pressable
          key={item.id}
          disabled={!canUpdate}
          onPress={() => openEdit(item)}
        >
          <CardBlock>
            <View style={{ flexDirection: "row", gap: 14 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  backgroundColor: "#eff6ff",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <MaterialCommunityIcons name="silverware-fork-knife" size={22} color="#2563eb" />
                )}
              </View>

              <View style={{ flex: 1, gap: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
                      {item.name || "Menu item"}
                    </Text>
                    <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                      {item.category || "Tanpa kategori"}
                    </Text>
                  </View>
                  <StatusPill label={item.is_available === false ? "Stop" : "Ready"} tone={item.is_available === false ? "amber" : "success"} />
                </View>

                <Text selectable style={{ color: "#475569", fontSize: 13, lineHeight: 20 }}>
                  {item.description || "Belum ada deskripsi menu."}
                </Text>

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <Text selectable style={{ color: "#1d4ed8", fontSize: 14, fontWeight: "900" }}>
                    {formatAmount(item.price)}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {canUpdate ? (
                      <>
                        <MiniAction
                          label={item.is_available === false ? "Ready" : "Stop"}
                          icon={item.is_available === false ? "check-circle-outline" : "pause-circle-outline"}
                          onPress={() => void toggleAvailability(item)}
                        />
                        <MiniAction label="Edit" icon="square-edit-outline" onPress={() => openEdit(item)} />
                      </>
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
                </View>
              </View>
            </View>
          </CardBlock>
        </Pressable>
      ))}

      {!query.isLoading && !filteredItems.length ? (
        <EmptyStateCard
          title="Menu belum ketemu"
          description="Belum ada item yang cocok dengan kata kunci atau kategori ini."
        />
      ) : null}

      <CenterModal
        open={editorOpen}
        title={editingItem ? "Edit menu" : "Tambah menu"}
        message="Form singkat untuk update katalog tanpa buka dashboard web."
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
            label="Nama menu"
            value={form.name}
            onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
            placeholder="Contoh: Indomie Goreng + Telur"
          />
          <SectionHeader title="Kategori" description="Pilih kelompok menu agar katalog tetap rapi." />
          <View style={{ flexDirection: "row", gap: 8 }}>
            {categoryOptions.map((option) => {
              const active = form.category === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setForm((current) => ({ ...current, category: option }))}
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: active ? "#2563eb" : "#dbe2ea",
                    backgroundColor: active ? "#eff6ff" : "#ffffff",
                    paddingHorizontal: 10,
                    paddingVertical: 12,
                  }}
                >
                  <Text selectable style={{ color: active ? "#1d4ed8" : "#0f172a", fontSize: 12, fontWeight: "800", textAlign: "center" }}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Field
            label="Harga"
            value={form.price}
            onChangeText={(value) => setForm((current) => ({ ...current, price: value.replace(/[^\d]/g, "") }))}
            placeholder="15000"
            keyboardType="number-pad"
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
                  Foto menu
                </Text>
                <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                  {form.imageUrl ? "Gambar sudah terpasang." : "Upload gambar dari galeri."}
                </Text>
              </View>
              <View style={{ width: 120 }}>
                <CtaButton
                  tone="secondary"
                  label={uploadingImage ? "Upload..." : form.imageUrl ? "Ganti foto" : "Upload foto"}
                  onPress={() => void handleUploadImage()}
                  disabled={uploadingImage || submitting}
                />
              </View>
            </View>
            {form.imageUrl ? (
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <Text selectable numberOfLines={1} style={{ flex: 1, color: "#2563eb", fontSize: 12, fontWeight: "700" }}>
                  Foto siap
                </Text>
                <Pressable onPress={() => setForm((current) => ({ ...current, imageUrl: "" }))}>
                  <Text selectable style={{ color: "#dc2626", fontSize: 12, fontWeight: "800" }}>
                    Hapus foto
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
          <Field
            label="Deskripsi"
            value={form.description}
            onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
            placeholder="Catatan singkat untuk tim dan customer"
            multiline
          />

          <View style={{ gap: 8 }}>
            <SectionHeader title="Status jual" description="Atur apakah item langsung tampil di flow operasional." />
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[
                { value: true, label: "Ready" },
                { value: false, label: "Stop" },
              ].map((option) => {
                const active = form.isAvailable === option.value;
                return (
                  <Pressable
                    key={option.label}
                    onPress={() => setForm((current) => ({ ...current, isAvailable: option.value }))}
                    style={{
                      flex: 1,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: active ? "#2563eb" : "#dbe2ea",
                      backgroundColor: active ? "#eff6ff" : "#ffffff",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                  >
                    <Text selectable style={{ color: active ? "#1d4ed8" : "#0f172a", fontSize: 13, fontWeight: "800", textAlign: "center" }}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </CenterModal>

      <ConfirmModal
        open={Boolean(deletingItem)}
        title="Hapus menu ini?"
        message="Item akan keluar dari katalog tenant."
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
