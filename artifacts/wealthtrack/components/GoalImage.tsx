import React, { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
export function GoalImage({
  uri,
  emoji = "🎯",
  size = 52,
}: {
  uri?: string;
  emoji?: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return uri && !failed ? (
    <Image
      accessibilityLabel="Goal photo"
      source={{ uri }}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: 14 }}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.55 }}>{emoji}</Text>
    </View>
  );
}
