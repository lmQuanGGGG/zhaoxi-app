import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { CANVAS, GLYPH_WIDTH, VEIN_WIDTH, glyph, hearts, leaves, palette, ring, type Leaf, type Pt, type Shape, type Stroke } from "./logo-geometry";

/** Points. */
const SPLASH_LOGO_SIZE = 216;

// Timeline (ms from the moment the native splash is hidden).
const RING = { start: 0, duration: 720 };
const GLYPH = { start: 160, end: 1280 };
const LEAF_LEFT = { start: 1060, duration: 460 };
const LEAF_RIGHT = { start: 1160, duration: 460 };
const HEART_BIG = { start: 1260, duration: 380 };
const HEART_SMALL = { start: 1360, duration: 380 };
const DRAW_END = 1740;
const HOLD = 80; // the finished mark rests a beat before leaving
const EXIT = 420;
const MAX_TOTAL = 2500; // leave by then even if the app is still loading underneath
const REDUCED_REVEAL = 260;
const REDUCED_MIN = 700;

// Strokes follow each other like a brush, each overlapping the previous one's last 18%.
const OVERLAP = 0.18;
const glyphTimes = (() => {
  const weights = glyph.map((stroke) => 70 + stroke.length * 0.35);
  const span = weights.reduce((sum, w, i) => sum + (i < weights.length - 1 ? w * (1 - OVERLAP) : w), 0);
  const scale = (GLYPH.end - GLYPH.start) / span;
  let cursor = GLYPH.start;
  return weights.map((w) => {
    const slot = { start: cursor, duration: w * scale };
    cursor += w * scale * (1 - OVERLAP);
    return slot;
  });
})();

const progress = (t: number, start: number, duration: number) => {
  "worklet";
  return Math.min(1, Math.max(0, (t - start) / duration));
};
const easeInOut = (x: number) => {
  "worklet";
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const easeOut = (x: number) => {
  "worklet";
  return 1 - Math.pow(1 - x, 3);
};
const easeOutBack = (x: number) => {
  "worklet";
  const c1 = 1.9;
  return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Launch animation: the ZhaoXi mark draws itself (ring, then 喜 stroke by stroke),
 * leaves and hearts settle in, and the petrol sheet lifts off the app, which has
 * been booting underneath the whole time. Frame one is the bare petrol sheet, the
 * same as the native launch screen (no image), so the hand-off is invisible.
 */
export function LaunchSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);
  const reveal = useSharedValue(reduceMotion ? 0 : 1);
  const exit = useSharedValue(0);
  const [started, setStarted] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [deadline, setDeadline] = useState(false);
  const laidOut = useRef(false);

  // Hide the native splash only once frame one is on screen, then start drawing.
  const onLayout = () => {
    if (laidOut.current) return;
    laidOut.current = true;
    requestAnimationFrame(() => {
      void SplashScreen.hideAsync().catch(() => undefined);
      setStarted(true);
    });
  };

  useEffect(() => {
    if (!started) return;
    if (reduceMotion) {
      t.value = DRAW_END;
      // Fades are fine under Reduce Motion; Reanimated would otherwise skip them to the end value.
      reveal.value = withTiming(1, { duration: REDUCED_REVEAL, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.Never });
    } else {
      t.value = withTiming(DRAW_END, { duration: DRAW_END, easing: Easing.linear });
    }
    const drawnTimer = setTimeout(() => setDrawn(true), reduceMotion ? REDUCED_MIN : DRAW_END + HOLD);
    const deadlineTimer = setTimeout(() => setDeadline(true), MAX_TOTAL - EXIT);
    return () => {
      clearTimeout(drawnTimer);
      clearTimeout(deadlineTimer);
    };
  }, [started, reduceMotion, t, reveal]);

  const exiting = deadline || (drawn && ready);
  useEffect(() => {
    if (!exiting) return;
    exit.value = withTiming(1, { duration: EXIT, easing: Easing.bezier(0.4, 0, 0.2, 1), reduceMotion: ReduceMotion.Never });
    const timer = setTimeout(onDone, EXIT);
    return () => clearTimeout(timer);
  }, [exiting, exit, onDone]);

  const sheetStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: reduceMotion ? 1 : 1 + 0.08 * exit.value }] }));
  const revealStyle = useAnimatedStyle(() => ({ opacity: reveal.value }));

  return (
    <Animated.View style={[styles.sheet, sheetStyle]} pointerEvents={exiting ? "none" : "auto"} onLayout={onLayout}>
      <Animated.View style={[styles.logo, logoStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, revealStyle]}>
          <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
            <Defs>
              <LinearGradient id="zx-ring" gradientUnits="userSpaceOnUse" x1={ring.gradient.x1} y1={ring.gradient.y1} x2={ring.gradient.x2} y2={ring.gradient.y2}>
                {palette.ring.map((stop) => <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />)}
              </LinearGradient>
            </Defs>
            <DrawnStroke stroke={ring} t={t} start={RING.start} duration={RING.duration} color="url(#zx-ring)" width={ring.width} pen="inOut" />
            {glyph.map((stroke, i) => (
              <DrawnStroke key={i} stroke={stroke} t={t} start={glyphTimes[i]!.start} duration={glyphTimes[i]!.duration} color={palette.orange} width={GLYPH_WIDTH} pen="out" />
            ))}
          </Svg>
          <Pop t={t} start={LEAF_LEFT.start} duration={LEAF_LEFT.duration} origin={leaves.left.base} kind="grow"><LeafArt leaf={leaves.left} /></Pop>
          <Pop t={t} start={LEAF_RIGHT.start} duration={LEAF_RIGHT.duration} origin={leaves.right.base} kind="grow"><LeafArt leaf={leaves.right} /></Pop>
          <Pop t={t} start={HEART_BIG.start} duration={HEART_BIG.duration} origin={hearts.big.center} kind="pop"><HeartArt heart={hearts.big} /></Pop>
          <Pop t={t} start={HEART_SMALL.start} duration={HEART_SMALL.duration} origin={hearts.small.center} kind="pop"><HeartArt heart={hearts.small} /></Pop>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

/** A stroke revealed along its length by animating the dash offset. */
function DrawnStroke({ stroke, t, start, duration, color, width, pen }: {
  stroke: Stroke;
  t: SharedValue<number>;
  start: number;
  duration: number;
  color: string;
  width: number;
  pen: "inOut" | "out";
}) {
  const animatedProps = useAnimatedProps(() => {
    const raw = progress(t.value, start, duration);
    const p = pen === "inOut" ? easeInOut(raw) : easeOut(raw);
    // Opacity 0 until the pen lands: a zero-length dash would still paint its round cap as a dot.
    return { strokeDashoffset: stroke.length * (1 - p), strokeOpacity: p > 0 ? 1 : 0 };
  });
  return (
    <AnimatedPath
      d={stroke.d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={[stroke.length, stroke.length + width]}
      animatedProps={animatedProps}
    />
  );
}

/** Full-canvas layer scaled about `origin`: leaves grow from the stem, hearts pop with a little overshoot. */
function Pop({ t, start, duration, origin, kind, children }: {
  t: SharedValue<number>;
  start: number;
  duration: number;
  origin: Pt;
  kind: "grow" | "pop";
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const raw = progress(t.value, start, duration);
    const grow = kind === "pop" ? easeOutBack(raw) : easeOut(raw);
    const scale = kind === "pop" ? 0.35 + 0.65 * grow : 0.15 + 0.85 * grow;
    return {
      opacity: Math.min(1, raw * 2.5),
      transform: [{ scale }, { rotate: `${kind === "grow" ? -16 * (1 - grow) : 0}deg` }],
    };
  });
  // In points (the layer is SPLASH_LOGO_SIZE square): RN's parser rejects fractional percentages.
  const transformOrigin = [(origin[0] / CANVAS) * SPLASH_LOGO_SIZE, (origin[1] / CANVAS) * SPLASH_LOGO_SIZE, 0];
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin }, style]}>
      <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>{children}</Svg>
    </Animated.View>
  );
}

function LeafArt({ leaf }: { leaf: Leaf }) {
  return (
    <>
      <Path d={leaf.d} fill={palette.leaf} />
      <Path d={leaf.shade} fill={palette.leafShade} />
      <Path d={leaf.veins} fill="none" stroke={palette.vein} strokeWidth={VEIN_WIDTH} strokeLinecap="round" />
    </>
  );
}

function HeartArt({ heart }: { heart: Shape }) {
  return <Path d={heart.d} fill={palette.orange} />;
}

const styles = StyleSheet.create({
  sheet: { ...StyleSheet.absoluteFill, zIndex: 100, alignItems: "center", justifyContent: "center", backgroundColor: palette.background },
  logo: { width: SPLASH_LOGO_SIZE, height: SPLASH_LOGO_SIZE },
});
