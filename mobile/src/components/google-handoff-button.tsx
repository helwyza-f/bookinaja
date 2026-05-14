import * as WebBrowser from "expo-web-browser";
import { Pressable, Text, View } from "react-native";

type GoogleHandoffButtonProps = {
  title: string;
  description: string;
  url: string;
};

export function GoogleHandoffButton({
  title,
  description,
  url,
}: GoogleHandoffButtonProps) {
  return (
    <Pressable
      onPress={() => {
        void WebBrowser.openBrowserAsync(url);
      }}
      style={{
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#bfdbfe",
        backgroundColor: "#eff6ff",
        paddingHorizontal: 18,
        paddingVertical: 16,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          {title}
        </Text>
        <Text selectable style={{ color: "#2563eb", fontSize: 14, fontWeight: "700" }}>
          Google
        </Text>
      </View>
      <Text selectable style={{ color: "#334155", fontSize: 14, lineHeight: 22 }}>
        {description}
      </Text>
    </Pressable>
  );
}
