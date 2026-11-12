import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, TextProps } from "react-native";
import { formatCurrencyFull } from "./UI";
/** Count and lift on a real amount change; respects the device's reduced-motion setting. */
export function AnimatedMoney({
  value,
  style,
  fromZero = false,
  ...props
}: TextProps & { value: number; fromZero?: boolean }) {
  const previous = useRef(fromZero ? 0 : value),
    number = useRef(new Animated.Value(fromZero ? 0 : value)).current,
    lift = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(fromZero ? 0 : value),
    [reduce, setReduce] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (active) setReduce(v);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    const id = number.addListener(({ value }) => setShown(value));
    return () => number.removeListener(id);
  }, [number]);
  useEffect(() => {
    if (reduce === null) return;
    number.stopAnimation();
    lift.stopAnimation();
    if (reduce || previous.current === value) {
      number.setValue(value);
      lift.setValue(0);
      setShown(value);
    } else {
      number.setValue(previous.current);
      lift.setValue(9);
      Animated.parallel([
        Animated.timing(number, {
          toValue: value,
          duration: 650,
          useNativeDriver: false,
        }),
        Animated.spring(lift, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 160,
        }),
      ]).start();
    }
    previous.current = value;
    return () => {
      number.stopAnimation();
      lift.stopAnimation();
    };
  }, [value, reduce, number, lift]);
  return (
    <Animated.Text
      {...props}
      style={[style, { transform: [{ translateY: lift }] }]}
    >
      {formatCurrencyFull(Math.round(shown * 100) / 100)}
    </Animated.Text>
  );
}
