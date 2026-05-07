import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { ScreenShell } from "@/components/screen-shell";
import { useAppTheme } from "@/theme";
import { useCustomerRequestOtpMutation } from "@/features/auth/mutations";

type PhoneForm = {
  phone: string;
};

export default function CustomerPhoneLoginScreen() {
  const theme = useAppTheme();
  const requestOtp = useCustomerRequestOtpMutation();
  const { control, handleSubmit } = useForm<PhoneForm>({
    defaultValues: {
      phone: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const phone = values.phone.trim();
    await requestOtp.mutateAsync({ phone });
    router.push({
      pathname: "/(auth)/verify-phone",
      params: { phone },
    });
  });

  return (
    <ScreenShell
      eyebrow="Login Customer"
      title="Masuk via No. HP"
      subtitle="Kami akan kirim kode OTP ke WhatsApp yang sudah terdaftar."
    >
      <View
        style={[
          styles.panel,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.panelTitle, { color: theme.colors.foreground }]}>Nomor WhatsApp</Text>
        <Text style={[styles.panelHint, { color: theme.colors.foregroundMuted }]}>
          Gunakan nomor yang pernah dipakai di akun Bookinaja.
        </Text>

        <Controller
          control={control}
          name="phone"
          rules={{ required: true }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="08xxxxxxxxxx"
              placeholderTextColor={theme.colors.foregroundMuted}
              keyboardType="phone-pad"
              autoCapitalize="none"
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.foreground,
                },
              ]}
            />
          )}
        />

        <Pressable
          onPress={() => void onSubmit()}
          disabled={requestOtp.isPending}
          style={[
            styles.submit,
            {
              backgroundColor: theme.colors.accent,
              opacity: requestOtp.isPending ? 0.8 : 1,
            },
          ]}
        >
          <Text style={styles.submitText}>{requestOtp.isPending ? "Mengirim..." : "Kirim OTP"}</Text>
        </Pressable>

        {requestOtp.error ? (
          <Text style={[styles.error, { color: theme.colors.danger }]}>
            {requestOtp.error instanceof Error ? requestOtp.error.message : "Gagal mengirim OTP"}
          </Text>
        ) : null}

        <Pressable onPress={() => router.replace("/(auth)/login")} hitSlop={8}>
          <Text style={[styles.secondaryLink, { color: theme.colors.accent }]}>Masuk dengan email</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  panelHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  submit: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  error: {
    fontSize: 12,
    lineHeight: 17,
  },
  secondaryLink: {
    fontSize: 13,
    fontWeight: "700",
  },
});
