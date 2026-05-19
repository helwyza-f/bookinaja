import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  type BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CtaButton } from "@/components/cta-button";
import {
  formatAmount,
  isDirectSaleResource,
  labelItemType,
  lowestCatalogPrice,
  type POSCatalogResource,
} from "@/lib/admin-orders";

type DirectSaleCatalogSheetProps = {
  open: boolean;
  title: string;
  description?: string;
  resources: POSCatalogResource[];
  initialResourceId?: string;
  initialQuantities?: Record<string, number>;
  busy?: boolean;
  confirmLabel?: string;
  onClose: () => void;
  onApply: (payload: { resourceId: string; quantities: Record<string, number> }) => void | Promise<void>;
};

function cleanQuantities(input: Record<string, number>) {
  return Object.entries(input).reduce<Record<string, number>>((acc, [key, value]) => {
    const quantity = Math.max(0, Number(value || 0));
    if (quantity > 0) acc[key] = quantity;
    return acc;
  }, {});
}

export function DirectSaleCatalogSheet({
  open,
  title,
  description,
  resources,
  initialResourceId,
  initialQuantities,
  busy = false,
  confirmLabel = "Simpan pilihan",
  onClose,
  onApply,
}: DirectSaleCatalogSheetProps) {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [stage, setStage] = useState<"resources" | "items">("resources");
  const [search, setSearch] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const sellableResources = useMemo(
    () => resources.filter(isDirectSaleResource),
    [resources],
  );
  const selectedResource = useMemo(
    () => sellableResources.find((item) => item.resource_id === selectedResourceId) || null,
    [selectedResourceId, sellableResources],
  );
  const filteredResources = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return sellableResources;
    return sellableResources.filter((resource) =>
      [
        resource.resource_name,
        resource.category,
        ...(resource.available_items || []).flatMap((item) => [item.name, item.item_type]),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [search, sellableResources]);
  const filteredItems = useMemo(() => {
    const source = selectedResource?.available_items || [];
    const needle = search.trim().toLowerCase();
    if (!needle) return source;
    return source.filter((item) =>
      `${item.name || ""} ${item.item_type || ""}`.toLowerCase().includes(needle),
    );
  }, [search, selectedResource?.available_items]);
  const selectedCount = useMemo(
    () => Object.values(quantities).reduce((sum, qty) => sum + Number(qty || 0), 0),
    [quantities],
  );
  const selectedTotal = useMemo(() => {
    const lookup = new Map(
      (selectedResource?.available_items || []).map((item) => [item.id, Number(item.price || 0)]),
    );
    return Object.entries(quantities).reduce(
      (sum, [itemId, qty]) => sum + Number(lookup.get(itemId) || 0) * Number(qty || 0),
      0,
    );
  }, [quantities, selectedResource?.available_items]);

  useEffect(() => {
    if (!open) {
      sheetRef.current?.dismiss();
      return;
    }
    const nextResourceId =
      initialResourceId ||
      (sellableResources.length === 1 ? sellableResources[0]?.resource_id : "");
    setSelectedResourceId(nextResourceId);
    setQuantities(cleanQuantities(initialQuantities || {}));
    setSearch("");
    setStage(nextResourceId ? "items" : "resources");
    sheetRef.current?.present();
  }, [initialQuantities, initialResourceId, open, sellableResources]);

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  function changeQuantity(itemId: string, nextQuantity: number) {
    setQuantities((current) => {
      const next = { ...current };
      if (nextQuantity <= 0) delete next[itemId];
      else next[itemId] = nextQuantity;
      return next;
    });
  }

  const renderBackdrop = useCallback(
    (props: Parameters<NonNullable<typeof BottomSheetBackdrop>>[0]) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.28} />
    ),
    [],
  );

  const footer = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={Math.max(insets.bottom, 10)}>
        <View
          style={{
            backgroundColor: "#ffffff",
            borderTopWidth: 1,
            borderTopColor: "#e9eef5",
            paddingHorizontal: 16,
            paddingTop: 12,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <View style={{ gap: 2, flex: 1 }}>
              <Text selectable style={{ color: "#94a3b8", fontSize: 11, fontWeight: "800", letterSpacing: 0.6 }}>
                PILIHAN
              </Text>
              <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
                {selectedCount} item
              </Text>
            </View>
            <View style={{ gap: 2, alignItems: "flex-end" }}>
              <Text selectable style={{ color: "#94a3b8", fontSize: 11, fontWeight: "800", letterSpacing: 0.6 }}>
                TOTAL
              </Text>
              <Text selectable style={{ color: "#1d4ed8", fontSize: 18, fontWeight: "900" }}>
                {formatAmount(selectedTotal)}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10, paddingBottom: 2 }}>
            {stage === "items" && sellableResources.length > 1 ? (
              <View style={{ flex: 1 }}>
                <CtaButton
                  tone="secondary"
                  label="Ganti resource"
                  onPress={() => {
                    setStage("resources");
                    setSearch("");
                  }}
                  disabled={busy}
                />
              </View>
            ) : null}
            <View style={{ flex: stage === "items" && sellableResources.length > 1 ? 1.4 : 1 }}>
              <CtaButton
                label={busy ? "Menyimpan..." : confirmLabel}
                onPress={() => {
                  if (!selectedResourceId) return;
                  void onApply({
                    resourceId: selectedResourceId,
                    quantities: cleanQuantities(quantities),
                  });
                }}
                disabled={busy || !selectedResourceId || selectedCount <= 0}
              />
            </View>
          </View>
        </View>
      </BottomSheetFooter>
    ),
    [busy, confirmLabel, insets.bottom, onApply, quantities, selectedCount, selectedResourceId, selectedTotal, sellableResources.length, stage],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={["90%"]}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      footerComponent={footer}
      onDismiss={handleDismiss}
      handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 54 }}
      backgroundStyle={{ backgroundColor: "#ffffff" }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetView style={{ flex: 1 }}>
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 148,
            gap: 14,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 28, fontWeight: "900", letterSpacing: -0.8 }}>
              {title}
            </Text>
            {description ? (
              <Text selectable style={{ color: "#64748b", fontSize: 14, lineHeight: 21 }}>
                {description}
              </Text>
            ) : null}
          </View>

          <BottomSheetTextInput
            value={search}
            onChangeText={setSearch}
            placeholder={stage === "resources" ? "Cari resource atau item..." : "Cari item..."}
            placeholderTextColor="#94a3b8"
            style={{
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "#d8e1ec",
              backgroundColor: "#fbfdff",
              paddingHorizontal: 14,
              paddingVertical: 14,
              color: "#0f172a",
              fontSize: 15,
            }}
          />

          {stage === "items" && selectedResource ? (
            <Pressable
              onPress={() => {
                if (sellableResources.length <= 1) return;
                setStage("resources");
                setSearch("");
              }}
              style={{ gap: 4 }}
            >
              <Text selectable style={{ color: "#2563eb", fontSize: 12, fontWeight: "800" }}>
                {sellableResources.length > 1 ? "Ganti resource" : "Resource"}
              </Text>
              <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "900" }}>
                {selectedResource.resource_name}
              </Text>
            </Pressable>
          ) : null}

          {stage === "resources" ? (
            filteredResources.length ? (
              filteredResources.map((resource) => (
                <Pressable
                  key={resource.resource_id}
                  onPress={() => {
                    setSelectedResourceId(resource.resource_id);
                    setSearch("");
                    setQuantities({});
                    setStage("items");
                  }}
                  style={{
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    backgroundColor: "#ffffff",
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: 148,
                      backgroundColor: "#edf4ff",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {resource.resource_image_url ? (
                      <Image
                        source={{ uri: resource.resource_image_url }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                    ) : (
                      <MaterialCommunityIcons name="shopping-outline" size={32} color="#2563eb" />
                    )}
                  </View>

                  <View style={{ paddingHorizontal: 14, paddingVertical: 14, gap: 6 }}>
                    <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
                      {resource.resource_name}
                    </Text>
                    <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                      {resource.category || "Direct sale"} • {resource.available_items?.length || 0} item
                    </Text>
                    <Text selectable style={{ color: "#1d4ed8", fontSize: 12, fontWeight: "800" }}>
                      Mulai {formatAmount(lowestCatalogPrice(resource.available_items || []))}
                    </Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <EmptyState text="Tidak ada katalog yang cocok dengan pencarian ini." />
            )
          ) : filteredItems.length ? (
            filteredItems.map((item) => {
              const quantity = Number(quantities[item.id] || 0);
              return (
                <View
                  key={item.id}
                  style={{
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: quantity > 0 ? "#bfdbfe" : "#e2e8f0",
                    backgroundColor: quantity > 0 ? "#f8fbff" : "#ffffff",
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    gap: 12,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                        {item.name}
                      </Text>
                      <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                        {labelItemType(item.item_type)} • {formatAmount(item.price)}
                        {item.price_unit ? ` / ${item.price_unit}` : ""}
                      </Text>
                    </View>
                    {item.is_default ? (
                      <View
                        style={{
                          borderRadius: 999,
                          backgroundColor: "#eff6ff",
                          paddingHorizontal: 9,
                          paddingVertical: 5,
                          alignSelf: "flex-start",
                        }}
                      >
                        <Text selectable style={{ color: "#1d4ed8", fontSize: 10, fontWeight: "800" }}>
                          Default
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "800" }}>
                      {quantity > 0 ? formatAmount(Number(item.price || 0) * quantity) : "Belum dipilih"}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <QtyButton label="-" onPress={() => changeQuantity(item.id, quantity - 1)} />
                      <Text selectable style={{ minWidth: 20, textAlign: "center", color: "#0f172a", fontSize: 15, fontWeight: "900" }}>
                        {quantity}
                      </Text>
                      <QtyButton label="+" onPress={() => changeQuantity(item.id, quantity + 1)} />
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <EmptyState text="Belum ada item yang cocok dengan pencarian ini." />
          )}
        </BottomSheetScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

function QtyButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 34,
        height: 34,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#dbe2ea",
        backgroundColor: "#ffffff",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "900" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderStyle: "dashed",
        backgroundColor: "#fbfdff",
        paddingHorizontal: 16,
        paddingVertical: 24,
      }}
    >
      <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
        {text}
      </Text>
    </View>
  );
}
