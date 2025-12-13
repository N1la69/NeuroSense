import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "./context/AuthContext";

export default function HomeScreen() {
  const { subjectId } = useAuth();
  const router = useRouter();

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 12 }}>
        Welcome 👋
      </Text>

      <Text style={{ fontSize: 16, color: "#555", marginBottom: 24 }}>
        Here is an overview of your child&apos;s attention training progress.
      </Text>

      <Pressable
        onPress={() => router.push(`/subjects/${subjectId}`)}
        style={{
          padding: 20,
          borderRadius: 12,
          backgroundColor: "#eef2ff",
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "600" }}>
          View My Child&apos;s Progress
        </Text>

        <Text style={{ marginTop: 6, color: "#555" }}>
          Sessions • Improvements • Insights
        </Text>
      </Pressable>
    </View>
  );
}
