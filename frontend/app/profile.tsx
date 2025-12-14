import { Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "./context/AuthContext";

const SUBJECTS = Array.from({ length: 15 }, (_, i) => ({
  parent: `Parent ${i + 1}`,
  subjectId: `SBJ${String(i + 1).padStart(2, "0")}`,
}));

export default function ProfileScreen() {
  const { subjectId, setSubjectId } = useAuth();
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>
        Select Child Profile
      </Text>

      <Text style={{ marginTop: 6, color: "#555" }}>
        Demo mode: one parent is linked to one child
      </Text>

      {SUBJECTS.map((s) => {
        const active = s.subjectId === subjectId;

        return (
          <Pressable
            key={s.subjectId}
            onPress={() => {
              setSubjectId(s.subjectId);
              router.replace("/");
            }}
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 12,
              backgroundColor: active ? "#e8edff" : "#f6f8ff",
              borderWidth: active ? 2 : 0,
              borderColor: "#4f7cff",
            }}
          >
            <Text style={{ fontWeight: "700" }}>{s.parent}</Text>
            <Text style={{ marginTop: 4, color: "#555" }}>
              Child ID: {s.subjectId}
            </Text>

            {active && (
              <Text
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: "600",
                  color: "#4f7cff",
                }}
              >
                Currently selected
              </Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
