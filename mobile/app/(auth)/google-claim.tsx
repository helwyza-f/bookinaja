import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { ScreenShell } from "@/components/screen-shell";
import { useAppTheme } from "@/theme";
import { useCustomerGoogleClaimMutation } from "@/features/auth/mutations";

type ClaimForm = {
  name: string;
  phone: string;
};

export default function GoogleClaimScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{
    claimToken?: string;
    name?: string;
    email?: string;
  }>();
  const claim = useCustomerGoogleClaimMutation();
  const { control, handleSubmit } = useForm<ClaimForm>({
    defaultValues: {
      name: typeof params.name === "string" ? params.name : "",
      phone: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const claimToken = typeof params.claimToken === "string" ? params.claimToken : "";
    const result = await claim.mutateAsync({
      claimToken,
      name: values.name,
      phone: values.phone,
    });
    router.replace({
      pathname: "/(auth)/verify-phone",
      params: { phone: result.phone },
    });
  });

  return (
    <ScreenShell
      eyebrow="Google"
      title="Lengkapi nomor WhatsApp"
      subtitle="Kami butuh nomor WhatsApp aktif untuk menyelesaikan akun Bookinaja kamu."
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
        {typeof params.email === "string" && params.email ? (
          <Text style={[styles.email, { color: theme.colors.foregroundMuted }]}>{params.email}</Text>
        ) : null}

        <Controller
          control={control}
          name="name"
          rules={{ required: true }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="Nama lengkap"
              placeholderTextColor={theme.colors.foregroundMuted}
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

        <Controller
          control={control}
          name="phone"
          rules={{ required: true }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="Nomor WhatsApp"
              placeholderTextColor={theme.colors.foregroundMuted}
              keyboardType="phone-pad"
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
          disabled={claim.isPending}
          style={[
            styles.submit,
            {
              backgroundColor: theme.colors.accent,
              opacity: claim.isPending ? 0.8 : 1,
            },
          ]}
        >
          <Text style={styles.submitText}>
            {claim.isPending ? "Mengirim OTP..." : "Lanjutkan dengan OTP"}
          </Text>
        </Pressable>

        {claim.error ? (
          <Text style={[styles.error, { color: theme.colors.danger }]}>
            {claim.error instanceof Error ? claim.error.message : "Claim Google gagal"}
          </Text>
        ) : null}
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
  email: {
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
});
