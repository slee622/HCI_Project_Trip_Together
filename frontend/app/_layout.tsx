import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="hello-world" options={{ title: 'Hello World' }} />
      <Stack.Screen name="hello-styles" options={{ title: 'Hello Styles' }} />
    </Stack>
  );
}
