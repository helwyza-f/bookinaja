import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CenterModal } from "@/components/center-modal";
import { CtaButton } from "@/components/cta-button";
import { adminUi } from "@/theme/admin-ui";

type ConfirmTone = "primary" | "danger";

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Lanjut",
  cancelLabel = "Batal",
  tone = "primary",
  busy = false,
  onCancel,
  onConfirm,
  children,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  const danger = tone === "danger";

  return (
    <CenterModal
      open={open}
      title=""
      onClose={onCancel}
      footer={
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <CtaButton
              tone="secondary"
              label={cancelLabel}
              onPress={onCancel}
              disabled={busy}
            />
          </View>
          <View style={{ flex: 1 }}>
            <CtaButton
              tone={danger ? "danger" : "primary"}
              label={busy ? "Memproses..." : confirmLabel}
              onPress={onConfirm}
              disabled={busy}
            />
          </View>
        </View>
      }
    >
      <View style={{ gap: 16 }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: adminUi.radius.control,
            backgroundColor: danger ? adminUi.tones.danger.soft : adminUi.tones.blue.soft,
            borderWidth: 1,
            borderColor: danger ? adminUi.tones.danger.border : adminUi.tones.blue.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons
            name={danger ? "alert-octagon-outline" : "progress-question"}
            size={22}
            color={danger ? adminUi.tones.danger.text : adminUi.colors.accent}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ color: adminUi.colors.textStrong, fontSize: 22, fontWeight: "900" }}>
            {title}
          </Text>
          {message ? (
            <Text style={{ color: adminUi.colors.textMuted, fontSize: 14, lineHeight: 21 }}>
              {message}
            </Text>
          ) : null}
        </View>

        {children}
      </View>
    </CenterModal>
  );
}
