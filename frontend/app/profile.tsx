import AppShell from "@/app/components/AppShell";
import { View, Text } from "react-native";

export default function ProfileScreen() {
  return (
    <AppShell>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>Parent Profile</Text>
        <Text style={{ marginTop: 6, color: "#666" }}>
          Profile and settings will appear here.
        </Text>
      </View>
    </AppShell>
  );
}
