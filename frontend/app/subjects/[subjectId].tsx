import { View, Text, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../services/api";
import { useEffect, useState } from "react";

export default function SubjectScreen() {
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
  const router = useRouter();
  const [subject, setSubject] = useState<any>(null);

  useEffect(() => {
    api.getManifest().then((m) => {
      const s = m.subjects.find((x: any) => x.id === subjectId);
      setSubject(s);
    });
  }, []);

  if (!subject) return null;

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>
        {subject.id} Sessions
      </Text>

      {subject.sessions.map((s: any) => (
        <Pressable
          key={s.session}
          onPress={() =>
            router.push(`/sessions/${subject.id}/${s.session}` as any)
          }
          style={{
            padding: 14,
            marginTop: 10,
            borderRadius: 6,
            backgroundColor: "#f2f2f2",
          }}
        >
          <Text>Session {s.session}</Text>
        </Pressable>
      ))}
    </View>
  );
}
