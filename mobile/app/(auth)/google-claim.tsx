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
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ClaimForm>({
    defaultValues: {
      name: typeof params.name === "string" ? params.name : "",
      phone: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const claimToken = typeof params.claimToken === "string" ? params.claimToken : "";
    if (!claimToken) {
      throw new Error("Sesi Google sudah habis. Login Google lagi untuk mulai ulang.");
    }

    const normalizedPhone = normalizePhone(values.phone);
    const result = await claim.mutateAsync({
      claimToken,
      name: values.name.trim(),
      phone: normalizedPhone,
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
          rules={{
            validate: (value) =>
              value.trim().length > 0 ? true : "Nama lengkap wajib diisi",
          }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="Nama lengkap"
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus={!params.name}
              editable={!claim.isPending}
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
        {errors.name ? (
          <Text style={[styles.error, { color: theme.colors.danger }]}>{errors.name.message}</Text>
        ) : null}

        <Controller
          control={control}
          name="phone"
          rules={{
            validate: (value) => {
              const normalized = normalizePhone(value);
              if (!normalized) return "Nomor WhatsApp wajib diisi";
              if (normalized.length < 9) return "Nomor WhatsApp belum valid";
              return true;
            },
          }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={(nextValue) => onChange(formatPhoneInput(nextValue))}
              placeholder="Nomor WhatsApp"
              autoFocus={!!params.name}
              editable={!claim.isPending}
              placeholderTextColor={theme.colors.foregroundMuted}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              returnKeyType="done"
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
        {errors.phone ? (
          <Text style={[styles.error, { color: theme.colors.danger }]}>{errors.phone.message}</Text>
        ) : (
          <Text style={[styles.hint, { color: theme.colors.foregroundMuted }]}>
            Pakai nomor WhatsApp aktif. Boleh mulai dengan 08 atau 62.
          </Text>
        )}

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
  hint: {
    fontSize: 12,
    lineHeight: 17,
  },
});

function normalizePhone(value: string) {
  return value.replace(/\D+/g, "");
}

function formatPhoneInput(value: string) {
  const digits = normalizePhone(value).slice(0, 15);
  if (!digits) return "";
  if (digits.length <= 4) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  if (digits.length <= 12) return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)} ${digits.slice(12)}`;
}
