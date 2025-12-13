// import { Stack } from "expo-router";

// export default function RootLayout() {
//   return (
//     <Stack>
//       <Stack.Screen name="index" options={{ title: "NeuroSense" }} />
//       <Stack.Screen
//         name="subjects/[subjectId]"
//         options={{ title: "Child Overview" }}
//       />
//       <Stack.Screen
//         name="sessions/[subjectId]/[sessionId]"
//         options={{ title: "Session Details" }}
//       />
//     </Stack>
//   );
// }

import { Stack } from "expo-router";
import { AuthProvider } from "./context/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
