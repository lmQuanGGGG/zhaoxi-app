import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { type FlatList, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { Extrapolation, FadeInDown, interpolate, scrollTo, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import { scheduleOnUI } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ONBOARDING_KEY } from "../src/constants";
import { localeLabels, supportedLocales, useI18n } from "../src/i18n";
import { registerForPush } from "../src/notifications";
import { colors, radius, space } from "../src/theme";
import { Button, Chip, haptic } from "../src/ui";

const images = [require("../assets/landmarks/dragon-bridge.webp"), require("../assets/landmarks/my-khe-beach.webp"), require("../assets/landmarks/han-river.webp")];

export default function Onboarding() {
  const { t, locale, setLocale } = useI18n();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const x = useSharedValue(0);
  const list = useAnimatedRef<FlatList<number>>();
  const [page, setPage] = useState(0);
  const slides = [
    { title: t.onboarding.s1t, body: t.onboarding.s1b },
    { title: t.onboarding.s2t, body: t.onboarding.s2b },
    { title: t.onboarding.s3t, body: t.onboarding.s3b },
  ];
  const onScroll = useAnimatedScrollHandler((event) => { x.value = event.contentOffset.x; });

  const finish = async (askPush: boolean) => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    haptic.success();
    if (askPush) await registerForPush(locale, true);
    router.replace("/");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#071A18" }}>
      <StatusBar style="light" />
      <Animated.FlatList
        ref={list}
        data={[0, 1, 2]}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / width))}
        keyExtractor={(item) => String(item)}
        renderItem={({ item }) => <Slide index={item} x={x} width={width} height={height} image={images[item]} />}
      />
      <LinearGradient pointerEvents="none" colors={["transparent", "rgba(7,26,24,0.85)", "#071A18"]} locations={[0.35, 0.62, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.languages, { top: insets.top + 10 }]}>
        {supportedLocales.map((code) => <Chip key={code} label={`${localeLabels[code].flag} ${localeLabels[code].native}`} active={locale === code} onPress={() => setLocale(code)} />)}
      </View>
      <View style={[styles.copy, { paddingBottom: Math.max(insets.bottom, 20) }]} pointerEvents="box-none">
        <Animated.View key={`${page}-${locale}`} entering={FadeInDown.duration(380)}>
          <Text style={styles.eyebrow}>ZHAOXI · 赵喜</Text>
          <Text style={styles.title}>{slides[page]?.title}</Text>
          <Text style={styles.body}>{slides[page]?.body}</Text>
        </Animated.View>
        <View style={styles.dots}>
          {slides.map((_, index) => <Dot key={index} index={index} x={x} width={width} />)}
        </View>
        {page < 2 ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button title={t.login.skip} variant="ghost" style={{ flex: 1 }} onPress={() => void finish(false)} />
            <Button title={t.onboarding.next} icon="arrow-forward" style={{ flex: 2 }} onPress={() => {
              const next = page + 1;
              setPage(next);
              scheduleOnUI(() => { "worklet"; scrollTo(list, next * width, 0, true); });
            }} />
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Button title={t.onboarding.enablePush} icon="notifications" onPress={() => void finish(true)} />
            <Button title={t.onboarding.start} variant="ghost" onPress={() => void finish(false)} />
          </View>
        )}
      </View>
    </View>
  );
}

function Slide({ index, x, width, height, image }: { index: number; x: SharedValue<number>; width: number; height: number; image: number }) {
  const style = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];
    return { transform: [{ translateX: interpolate(x.value, input, [-width * 0.35, 0, width * 0.35], Extrapolation.CLAMP) }, { scale: interpolate(x.value, input, [1.2, 1.05, 1.2], Extrapolation.CLAMP) }] };
  });
  return (
    <View style={{ width, height, overflow: "hidden" }}>
      <Animated.View style={[StyleSheet.absoluteFill, style]}>
        <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Animated.View>
    </View>
  );
}

function Dot({ index, x, width }: { index: number; x: SharedValue<number>; width: number }) {
  const style = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];
    return { width: interpolate(x.value, input, [8, 26, 8], Extrapolation.CLAMP), opacity: interpolate(x.value, input, [0.4, 1, 0.4], Extrapolation.CLAMP) };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  languages: { position: "absolute", left: space.lg, right: space.lg, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  copy: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, gap: 20 },
  eyebrow: { color: colors.brand, fontWeight: "900", letterSpacing: 2, fontSize: 12 },
  title: { color: colors.white, fontSize: 34, fontWeight: "900", letterSpacing: -0.8, marginTop: 8 },
  body: { color: "rgba(255,255,255,0.82)", fontSize: 16, lineHeight: 23, marginTop: 10 },
  dots: { flexDirection: "row", gap: 6 },
  dot: { height: 8, borderRadius: radius.pill, backgroundColor: colors.white },
});
