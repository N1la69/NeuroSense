import { View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BottomBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",

        // ✅ Safe area padding
        paddingBottom: Math.max(insets.bottom, 12),
        paddingTop: 10,

        borderTopWidth: 1,
        borderColor: "#eef0f5",
        backgroundColor: "#ffffff",
      }}
    >
      {/* Home */}
      <Pressable
        onPress={() => router.push("/")}
        style={{ alignItems: "center" }}
      >
        <Ionicons name="home-outline" size={24} color="#4f7cff" />
        <Text style={{ fontSize: 12, color: "#4f7cff", marginTop: 2 }}>
          Home
        </Text>
      </Pressable>

      {/* Profile */}
      <Pressable
        onPress={() => router.push("/profile")}
        style={{ alignItems: "center" }}
      >
        <Ionicons name="person-circle-outline" size={26} color="#777" />
        <Text style={{ fontSize: 12, color: "#777", marginTop: 2 }}>
          Profile
        </Text>
      </Pressable>
    </View>
  );
}
