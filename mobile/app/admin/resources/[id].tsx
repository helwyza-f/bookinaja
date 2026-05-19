import { useMemo, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CenterModal } from "@/components/center-modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useAdminIdentity } from "@/hooks/use-admin-identity";
import { useToast } from "@/hooks/use-toast";
import { hasAdminPermission } from "@/lib/admin-access";
import { formatCurrency } from "@/lib/format";
import { pickAndUploadImage } from "@/lib/media-upload";

type ResourceItemConfig = {
  id: string;
  name: string;
  price: number;
  price_unit?: string;
  unit_duration?: number;
  is_default?: boolean;
  item_type?: string;
};

type ResourceDetail = {
  id: string;
  name: string;
  category?: string;
  operating_mode?: string;
  description?: string;
  image_url?: string;
  gallery?: string[];
  items?: ResourceItemConfig[];
  dp_enabled?: boolean;
  dp_percentage?: number;
  metadata?: unknown;
  tenant_id?: string;
  created_at?: string;
};

type BasicForm = {
  description: string;
  imageUrl: string;
  operatingMode: "timed" | "hybrid" | "direct_sale";
};

type ItemForm = {
  name: string;
  price: string;
  itemType: "main" | "addon";
  priceUnit: string;
  unitDuration: string;
  isDefault: boolean;
};

const timeUnitOptions = [
  { value: "hour", label: "Per jam", minutes: 60 },
  { value: "session", label: "Per sesi", minutes: 60 },
  { value: "day", label: "Per hari", minutes: 1440 },
  { value: "week", label: "Per minggu", minutes: 10080 },
  { value: "month", label: "Per bulan", minutes: 43200 },
  { value: "year", label: "Per tahun", minutes: 525600 },
] as const;

const directSaleUnit = { value: "pcs", label: "Per pcs", minutes: 0 } as const;

function formatAmount(value?: number) {
  const formatted = formatCurrency(value || 0);
  return formatted === "Cek harga" ? "Rp 0" : formatted;
}

export default function AdminResourceDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = String(params.id || "");
  const guard = useAuthGuard("admin");
  const identity = useAdminIdentity();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [basicEditorOpen, setBasicEditorOpen] = useState(false);
  const [itemEditorOpen, setItemEditorOpen] = useState(false);
  const [basicSubmitting, setBasicSubmitting] = useState(false);
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState<ResourceItemConfig | null>(null);
  const [deletingCatalogItem, setDeletingCatalogItem] = useState<ResourceItemConfig | null>(null);
  const [basicForm, setBasicForm] = useState<BasicForm>({
    description: "",
    imageUrl: "",
    operatingMode: "timed",
  });
  const [itemForm, setItemForm] = useState<ItemForm>({
    name: "",
    price: "",
    itemType: "main",
    priceUnit: "hour",
    unitDuration: "60",
    isDefault: false,
  });

  const canUpdate = hasAdminPermission(identity.data, "resources.update");
  const canDelete = hasAdminPermission(identity.data, "resources.delete");

  const detailQuery = useQuery({
    queryKey: ["admin-mobile-resource-detail", id],
    enabled: guard.ready && Boolean(id),
    queryFn: async () => {
      const detail = await apiFetch<ResourceDetail>(`/resources-all/${id}`, { audience: "admin" });
      setBasicForm({
        description: detail.description || "",
        imageUrl: detail.image_url || "",
        operatingMode: normalizeMode(detail.operating_mode),
      });
      return detail;
    },
  });

  const detail = detailQuery.data;
  const items = detail?.items || [];
  const mainItems = useMemo(
    () =>
      items
        .filter((item) => ["main_option", "main", "console_option"].includes(String(item.item_type || "")))
        .sort((left, right) => Number(right.is_default) - Number(left.is_default)),
    [items],
  );
  const addonItems = useMemo(
    () => items.filter((item) => ["add_on", "addon"].includes(String(item.item_type || ""))),
    [items],
  );

  function openBasicEditor() {
    if (!detail) return;
    setBasicForm({
      description: detail.description || "",
      imageUrl: detail.image_url || "",
      operatingMode: normalizeMode(detail.operating_mode),
    });
    setBasicEditorOpen(true);
  }

  function openCreateItem(type: "main" | "addon") {
    const directSale = basicForm.operatingMode === "direct_sale";
    setEditingCatalogItem(null);
    setItemForm({
      name: "",
      price: "",
      itemType: type,
      priceUnit: type === "addon" ? "pcs" : directSale ? "pcs" : "hour",
      unitDuration: type === "addon" || directSale ? "0" : "60",
      isDefault: false,
    });
    setItemEditorOpen(true);
  }

  function openEditItem(item: ResourceItemConfig) {
    const mappedType = mapItemType(item.item_type);
    setEditingCatalogItem(item);
    setItemForm({
      name: item.name || "",
      price: String(Math.round(Number(item.price || 0))),
      itemType: mappedType,
      priceUnit: item.price_unit || (mappedType === "addon" ? "pcs" : basicForm.operatingMode === "direct_sale" ? "pcs" : "hour"),
      unitDuration: String(Number(item.unit_duration || 0)),
      isDefault: Boolean(item.is_default),
    });
    setItemEditorOpen(true);
  }

  function closeItemEditor() {
    if (itemSubmitting) return;
    setItemEditorOpen(false);
    setEditingCatalogItem(null);
  }

  async function refetchResource() {
    await queryClient.invalidateQueries({ queryKey: ["admin-mobile-resource-detail", id] });
    await queryClient.invalidateQueries({ queryKey: ["admin-mobile-resources"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-mobile-booking-manual-setup"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-dashboard-mobile"] });
  }

  async function submitBasic() {
    if (!detail || !canUpdate) return;
    try {
      setBasicSubmitting(true);
      await apiFetch(`/resources-all/${id}`, {
        audience: "admin",
        method: "PUT",
        body: JSON.stringify({
          ...detail,
          description: basicForm.description.trim(),
          image_url: basicForm.imageUrl.trim(),
          gallery: detail.gallery || [],
          operating_mode: basicForm.operatingMode,
        }),
      });
      await refetchResource();
      setBasicEditorOpen(false);
      showToast({
        title: "Resource diupdate",
        message: "Detail resource sudah diperbarui.",
        tone: "success",
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal simpan",
        message: err.message || "Perubahan resource belum berhasil disimpan.",
        tone: "error",
      });
    } finally {
      setBasicSubmitting(false);
    }
  }

  async function handleUploadCover() {
    try {
      setUploadingCover(true);
      const uploaded = await pickAndUploadImage({
        endpoint: "/resources-all/upload-cover",
        audience: "admin",
      });
      if (!uploaded?.url) return;
      setBasicForm((current) => ({ ...current, imageUrl: uploaded.url }));
      showToast({
        title: "Cover siap",
        message: "Foto cover resource berhasil diupload.",
        tone: "success",
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Upload gagal",
        message: err.message || "Cover resource belum berhasil diupload.",
        tone: "error",
      });
    } finally {
      setUploadingCover(false);
    }
  }

  async function submitItem() {
    if (!canUpdate) return;
    if (!itemForm.name.trim()) {
      showToast({ title: "Nama wajib", message: "Isi nama item dulu.", tone: "warning" });
      return;
    }
    const price = Number(itemForm.price.replace(/[^\d]/g, ""));
    if (!Number.isFinite(price) || price <= 0) {
      showToast({ title: "Harga belum valid", message: "Isi harga item dengan benar.", tone: "warning" });
      return;
    }

    const directSale = basicForm.operatingMode === "direct_sale";
    const unitDuration =
      itemForm.itemType === "addon" || directSale
        ? 0
        : Number(itemForm.unitDuration.replace(/[^\d]/g, "")) || resolveUnitMinutes(itemForm.priceUnit);

    const payload = {
      name: itemForm.name.trim().toUpperCase(),
      price,
      price_unit: itemForm.itemType === "addon" ? "pcs" : itemForm.priceUnit,
      unit_duration: unitDuration,
      is_default: itemForm.itemType === "addon" ? false : itemForm.isDefault,
      item_type: itemForm.itemType === "main" ? "main_option" : "add_on",
    };

    try {
      setItemSubmitting(true);
      if (editingCatalogItem?.id) {
        await apiFetch(`/resources-all/items/${editingCatalogItem.id}`, {
          audience: "admin",
          method: "PUT",
          body: JSON.stringify({ ...editingCatalogItem, ...payload }),
        });
      } else {
        await apiFetch(`/resources-all/${id}/items`, {
          audience: "admin",
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      await refetchResource();
      closeItemEditor();
      showToast({
        title: editingCatalogItem ? "Item diupdate" : "Item ditambah",
        message: editingCatalogItem ? "Konfigurasi item sudah diperbarui." : "Item baru sudah masuk ke resource.",
        tone: "success",
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal simpan",
        message: err.message || "Item resource belum berhasil disimpan.",
        tone: "error",
      });
    } finally {
      setItemSubmitting(false);
    }
  }

  async function handleSetDefault(item: ResourceItemConfig) {
    if (!canUpdate) return;
    try {
      await apiFetch(`/resources-all/items/${item.id}`, {
        audience: "admin",
        method: "PUT",
        body: JSON.stringify({
          ...item,
          is_default: true,
        }),
      });
      await refetchResource();
      showToast({
        title: "Default diupdate",
        message: "Paket utama resource sudah diperbarui.",
        tone: "success",
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal update",
        message: err.message || "Default package belum berhasil diubah.",
        tone: "error",
      });
    }
  }

  async function deleteCatalogItem() {
    if (!deletingCatalogItem?.id || !canDelete) return;
    try {
      setItemSubmitting(true);
      await apiFetch(`/resources-all/items/${deletingCatalogItem.id}`, {
        audience: "admin",
        method: "DELETE",
      });
      await refetchResource();
      setDeletingCatalogItem(null);
      showToast({
        title: "Item dihapus",
        message: "Item resource sudah dikeluarkan.",
        tone: "success",
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal hapus",
        message: err.message || "Item resource belum berhasil dihapus.",
        tone: "error",
      });
    } finally {
      setItemSubmitting(false);
    }
  }

  return (
    <ScreenShell
      eyebrow="Operations"
      title={detail?.name || "Resource"}
      description="Kelola detail unit, paket harga, dan add-on langsung dari mobile."
      includeBottomSafeArea={false}
    >
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/admin/resources"))}>
        <Text selectable style={{ color: "#64748b", fontSize: 13, fontWeight: "800" }}>
          Kembali
        </Text>
      </Pressable>

      <CardBlock>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
              {detail?.name || "Resource"}
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
              {detail?.category || "Kategori belum diisi"} • {formatMode(detail?.operating_mode)}
            </Text>
          </View>
          {canUpdate ? (
            <View style={{ width: 120 }}>
              <CtaButton tone="secondary" label="Edit unit" onPress={openBasicEditor} />
            </View>
          ) : null}
        </View>
      </CardBlock>

      <CardBlock>
        <View style={{ gap: 8 }}>
          <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "900" }}>
            Paket utama
          </Text>
          <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
            Kelola paket booking atau item utama yang dipakai resource ini.
          </Text>
        </View>
        {canUpdate ? <CtaButton label="Tambah paket" onPress={() => openCreateItem("main")} /> : null}
        {mainItems.length ? (
          mainItems.map((item) => (
            <CatalogItemCard
              key={item.id}
              item={item}
              showDefaultAction
              onEdit={() => openEditItem(item)}
              onDelete={() => setDeletingCatalogItem(item)}
              onSetDefault={() => void handleSetDefault(item)}
            />
          ))
        ) : (
          <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
            Belum ada paket utama di resource ini.
          </Text>
        )}
      </CardBlock>

      <CardBlock>
        <View style={{ gap: 8 }}>
          <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "900" }}>
            Add-on
          </Text>
          <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
            Tambahan layanan, perlengkapan, atau item ekstra untuk resource ini.
          </Text>
        </View>
        {canUpdate ? <CtaButton tone="secondary" label="Tambah add-on" onPress={() => openCreateItem("addon")} /> : null}
        {addonItems.length ? (
          addonItems.map((item) => (
            <CatalogItemCard
              key={item.id}
              item={item}
              onEdit={() => openEditItem(item)}
              onDelete={() => setDeletingCatalogItem(item)}
            />
          ))
        ) : (
          <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
            Belum ada add-on di resource ini.
          </Text>
        )}
      </CardBlock>

      <CenterModal
        open={basicEditorOpen}
        title="Edit resource"
        message="Atur mode operasional, cover, dan deskripsi publik resource."
        onClose={() => setBasicEditorOpen(false)}
        footer={
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <CtaButton tone="secondary" label="Tutup" onPress={() => setBasicEditorOpen(false)} disabled={basicSubmitting} />
            </View>
            <View style={{ flex: 1 }}>
              <CtaButton label={basicSubmitting ? "Menyimpan..." : "Simpan"} onPress={() => void submitBasic()} disabled={basicSubmitting} />
            </View>
          </View>
        }
      >
        <View style={{ gap: 12 }}>
          <View style={{ gap: 8 }}>
            <Text selectable style={{ color: "#64748b", fontSize: 12, fontWeight: "800", letterSpacing: 0.4 }}>
              MODE OPERASIONAL
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { value: "timed" as const, label: "Timed" },
                { value: "hybrid" as const, label: "Hybrid" },
                { value: "direct_sale" as const, label: "Direct sale" },
              ].map((option) => {
                const active = basicForm.operatingMode === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setBasicForm((current) => ({ ...current, operatingMode: option.value }))}
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
          </View>

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
                  Cover resource
                </Text>
                <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                  {basicForm.imageUrl ? "Cover sudah terpasang." : "Upload cover dari galeri."}
                </Text>
              </View>
              <View style={{ width: 120 }}>
                <CtaButton
                  tone="secondary"
                  label={uploadingCover ? "Upload..." : basicForm.imageUrl ? "Ganti cover" : "Upload cover"}
                  onPress={() => void handleUploadCover()}
                  disabled={uploadingCover || basicSubmitting}
                />
              </View>
            </View>
            {basicForm.imageUrl ? (
              <Pressable onPress={() => setBasicForm((current) => ({ ...current, imageUrl: "" }))}>
                <Text selectable style={{ color: "#dc2626", fontSize: 12, fontWeight: "800" }}>
                  Hapus cover
                </Text>
              </Pressable>
            ) : null}
          </View>

          <TextInput
            value={basicForm.description}
            onChangeText={(value) => setBasicForm((current) => ({ ...current, description: value }))}
            placeholder="Deskripsi singkat resource"
            placeholderTextColor="#94a3b8"
            multiline
            style={[inputStyle, { minHeight: 110, textAlignVertical: "top" }]}
          />
        </View>
      </CenterModal>

      <CenterModal
        open={itemEditorOpen}
        title={editingCatalogItem ? "Edit item resource" : "Tambah item resource"}
        message="Atur paket utama atau add-on sesuai mode operasional resource."
        onClose={closeItemEditor}
        footer={
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <CtaButton tone="secondary" label="Tutup" onPress={closeItemEditor} disabled={itemSubmitting} />
            </View>
            <View style={{ flex: 1 }}>
              <CtaButton label={itemSubmitting ? "Menyimpan..." : "Simpan"} onPress={() => void submitItem()} disabled={itemSubmitting} />
            </View>
          </View>
        }
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { value: "main" as const, label: "Paket utama" },
              { value: "addon" as const, label: "Add-on" },
            ].map((option) => {
              const active = itemForm.itemType === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() =>
                    setItemForm((current) => ({
                      ...current,
                      itemType: option.value,
                      priceUnit: option.value === "addon" ? "pcs" : basicForm.operatingMode === "direct_sale" ? "pcs" : current.priceUnit || "hour",
                      unitDuration: option.value === "addon" || basicForm.operatingMode === "direct_sale" ? "0" : current.unitDuration || "60",
                      isDefault: option.value === "addon" ? false : current.isDefault,
                    }))
                  }
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

          <TextInput
            value={itemForm.name}
            onChangeText={(value) => setItemForm((current) => ({ ...current, name: value }))}
            placeholder="Nama item"
            placeholderTextColor="#94a3b8"
            style={inputStyle}
          />
          <TextInput
            value={itemForm.price}
            onChangeText={(value) => setItemForm((current) => ({ ...current, price: value.replace(/[^\d]/g, "") }))}
            placeholder="Harga"
            keyboardType="number-pad"
            placeholderTextColor="#94a3b8"
            style={inputStyle}
          />

          {itemForm.itemType === "main" ? (
            <>
              <View style={{ gap: 8 }}>
                <Text selectable style={{ color: "#64748b", fontSize: 12, fontWeight: "800", letterSpacing: 0.4 }}>
                  SATUAN HARGA
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {(basicForm.operatingMode === "direct_sale"
                    ? [directSaleUnit]
                    : timeUnitOptions
                  ).map((option) => {
                    const active = itemForm.priceUnit === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() =>
                          setItemForm((current) => ({
                            ...current,
                            priceUnit: option.value,
                            unitDuration: String(option.minutes),
                          }))
                        }
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
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {basicForm.operatingMode !== "direct_sale" ? (
                <TextInput
                  value={itemForm.unitDuration}
                  onChangeText={(value) => setItemForm((current) => ({ ...current, unitDuration: value.replace(/[^\d]/g, "") }))}
                  placeholder="Durasi dalam menit"
                  keyboardType="number-pad"
                  placeholderTextColor="#94a3b8"
                  style={inputStyle}
                />
              ) : null}

              <Pressable
                onPress={() => setItemForm((current) => ({ ...current, isDefault: !current.isDefault }))}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: itemForm.isDefault ? "#2563eb" : "#dbe2ea",
                  backgroundColor: itemForm.isDefault ? "#eff6ff" : "#ffffff",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "800" }}>
                  Jadikan paket default
                </Text>
                <MaterialCommunityIcons
                  name={itemForm.isDefault ? "check-circle" : "checkbox-blank-circle-outline"}
                  size={20}
                  color={itemForm.isDefault ? "#2563eb" : "#94a3b8"}
                />
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </CenterModal>

      <ConfirmModal
        open={Boolean(deletingCatalogItem)}
        title="Hapus item ini?"
        message="Paket atau add-on akan keluar dari resource."
        confirmLabel="Hapus"
        tone="danger"
        busy={itemSubmitting}
        onCancel={() => setDeletingCatalogItem(null)}
        onConfirm={() => void deleteCatalogItem()}
      />
    </ScreenShell>
  );
}

function CatalogItemCard({
  item,
  showDefaultAction,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  item: ResourceItemConfig;
  showDefaultAction?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault?: () => void;
}) {
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        backgroundColor: "#fbfdff",
        paddingHorizontal: 14,
        paddingVertical: 14,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
            {item.name}
          </Text>
          <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
            {formatAmount(item.price)} • {priceUnitLabel(item.price_unit)}{item.unit_duration ? ` • ${durationLabel(item.unit_duration)}` : ""}
          </Text>
        </View>
        {item.is_default ? (
          <View style={{ borderRadius: 999, backgroundColor: "#eff6ff", paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text selectable style={{ color: "#1d4ed8", fontSize: 11, fontWeight: "800" }}>
              Default
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
        {showDefaultAction && !item.is_default && onSetDefault ? (
          <MiniAction label="Set default" icon="star-outline" onPress={onSetDefault} />
        ) : null}
        <MiniAction label="Edit" icon="square-edit-outline" onPress={onEdit} />
        <MiniAction label="Hapus" icon="trash-can-outline" tone="danger" onPress={onDelete} />
      </View>
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

function resolveUnitMinutes(unit: string) {
  if (unit === directSaleUnit.value) return directSaleUnit.minutes;
  return timeUnitOptions.find((option) => option.value === unit)?.minutes || 60;
}

function priceUnitLabel(unit?: string) {
  const value = String(unit || "").toLowerCase();
  if (value === "pcs") return "pcs";
  return timeUnitOptions.find((option) => option.value === value)?.label.toLowerCase() || value || "unit";
}

function durationLabel(minutes?: number) {
  const value = Number(minutes || 0);
  if (!value) return "";
  if (value % 525600 === 0) return `${value / 525600} tahun`;
  if (value % 43200 === 0) return `${value / 43200} bulan`;
  if (value % 10080 === 0) return `${value / 10080} minggu`;
  if (value % 1440 === 0) return `${value / 1440} hari`;
  if (value % 60 === 0) return `${value / 60} jam`;
  return `${value} menit`;
}

function mapItemType(value?: string): "main" | "addon" {
  return ["add_on", "addon"].includes(String(value || "").toLowerCase()) ? "addon" : "main";
}

function normalizeMode(value?: string): "timed" | "hybrid" | "direct_sale" {
  if (String(value || "").toLowerCase() === "direct_sale") return "direct_sale";
  if (String(value || "").toLowerCase() === "hybrid") return "hybrid";
  return "timed";
}

function formatMode(value?: string) {
  const mode = normalizeMode(value);
  if (mode === "direct_sale") return "Direct sale";
  if (mode === "hybrid") return "Hybrid";
  return "Timed";
}

const inputStyle = {
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "#d6deea",
  backgroundColor: "#fbfdff",
  paddingHorizontal: 14,
  paddingVertical: 14,
  color: "#0f172a",
  fontSize: 15,
} as const;
