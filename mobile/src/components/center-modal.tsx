import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { adminUi } from "@/theme/admin-ui";

type CenterModalProps = {
  open: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
};

export function CenterModal({
  open,
  title,
  message,
  onClose,
  children,
  footer,
}: CenterModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          paddingTop: Math.max(insets.top, 24),
          paddingBottom: Math.max(insets.bottom, 24),
          paddingHorizontal: 18,
          backgroundColor: "rgba(15, 23, 42, 0.44)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Pressable
          onPress={onClose}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <View
          style={{
            width: "100%",
            maxWidth: 420,
            maxHeight: "84%",
            borderRadius: adminUi.radius.cardLarge,
            borderWidth: 1,
            borderColor: adminUi.colors.line,
            backgroundColor: adminUi.colors.surface,
            overflow: "hidden",
          }}
        >
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 18,
              paddingTop: 18,
              paddingBottom: footer ? 14 : 18,
              gap: 14,
            }}
          >
            {title || message ? (
              <View style={{ gap: 6 }}>
                {title ? (
                  <Text selectable style={{ color: adminUi.colors.textStrong, fontSize: 21, fontWeight: "900" }}>
                    {title}
                  </Text>
                ) : null}
                {message ? (
                  <Text selectable style={{ color: adminUi.colors.textMuted, fontSize: 14, lineHeight: 21 }}>
                    {message}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {children}
          </ScrollView>

          {footer ? (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: adminUi.colors.lineSoft,
                backgroundColor: adminUi.colors.surface,
                paddingHorizontal: 18,
                paddingTop: 14,
                paddingBottom: Math.max(insets.bottom, 14),
              }}
            >
              {footer}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
