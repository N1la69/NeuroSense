import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { api } from "./services/api";

export default function HomeScreen() {
  const router = useRouter();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getManifest()
      .then(setData)
      .catch((e) => {
        console.error(e);
        setError(e.message ?? "Failed to load backend");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }

  if (error) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: "red", marginBottom: 8 }}>Backend error:</Text>
        <Text>{error}</Text>
      </View>
    );
  }

  if (!data || !data.subjects) {
    return (
      <View style={{ padding: 16 }}>
        <Text>No subjects found.</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 16 }}>
        Your Child
      </Text>

      {data.subjects.map((s: any) => (
        <Pressable
          key={s.id}
          onPress={() => router.push(`/subjects/${s.id}`)}
          style={{
            padding: 16,
            borderRadius: 8,
            backgroundColor: "#eef",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16 }}>{s.id}</Text>
          <Text style={{ color: "#555" }}>Sessions: {s.sessions.length}</Text>
        </Pressable>
      ))}
    </View>
  );
}
