import Svg, { Circle, Path } from "react-native-svg";

// Stroke icons copied from the PWA (CustomerIcon.tsx, the shared top bar and
// the role bottom navigation) so both channels use the exact same glyphs.
const paths = {
  assistant: ["M12 4a5 5 0 0 0-5 5v2.5A3.5 3.5 0 0 0 10.5 15h3a3.5 3.5 0 0 0 3.5-3.5V9a5 5 0 0 0-5-5Z", "M9 20c.7-2.3 1.7-3.5 3-3.5s2.3 1.2 3 3.5M7 9H5v3h2m10-3h2v3h-2"],
  bell: ["M6.5 9a5.5 5.5 0 0 1 11 0c0 5 2 5.2 2 7H4.5c0-1.8 2-2 2-7M10 19h4"],
  car: ["m5 11 2-5h10l2 5m-15 0h16v7H4zm3 3h.01M17 14h.01M6 18v2m12-2v2"],
  chevron: ["m9 5 7 7-7 7"],
  back: ["m15 5-7 7 7 7"],
  community: ["M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-1a2.5 2.5 0 1 0 0-5M3 19c.4-4 2.2-6 5.5-6s5.1 2 5.5 6m1-6c3.2 0 5 2 5.5 5"],
  emergency: ["M12 3 4 7v5c0 4.7 3.1 7.6 8 9 4.9-1.4 8-4.3 8-9V7Zm0 5v5m0 3h.01"],
  food: ["M7 3v7m-3-7v5c0 2 1 3 3 3s3-1 3-3V3m-3 8v10m9-18c-2 2-3 4.3-3 7v3h4m0-10v18"],
  heart: ["M20 8.5C20 14 12 19 12 19S4 14 4 8.5C4 5.5 7.5 4 12 7c4.5-3 8-.5 8 1.5Z"],
  home: ["M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"],
  housing: ["M4 21V8l8-5 8 5v13M8 11h3v3H8zm5 0h3v3h-3m-5 3h3v4H8m5-4h3v4h-3"],
  location: ["M12 21s7-6.3 7-12A7 7 0 0 0 5 9c0 5.7 7 12 7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
  logout: ["M10 5H5v14h5M13 8l4 4-4 4M8 12h9"],
  login: ["M14 5h5v14h-5M10 8l4 4-4 4M3 12h11"],
  map: ["M9 4 3 6.5v13L9 17l6 2.5 6-2.5V4l-6 2.5L9 4Zm0 0v13m6-10.5v13"],
  market: ["M5 9V5h14v4l-1 3H6Zm1 3v9h12v-9M9 21v-5h6v5"],
  medical: ["M8 3h8v5h5v8h-5v5H8v-5H3V8h5Z"],
  messages: ["M4 5h16v12H8l-4 3z"],
  orders: ["M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z", "M9 3v3h6V3M9 11h6M9 15h4M8.5 8.5l1.2 1.2 2-2"],
  passport: ["M6 3h12v18H6Zm3 5h6m-6 8h6m-3-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"],
  payment: ["M3 6h18v13H3Zm0 4h18M7 15h4"],
  police: ["m12 3 8 4v5c0 4.5-3 7.4-8 9-5-1.6-8-4.5-8-9V7Zm-3 9h6m-3-3v6"],
  profile: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0"],
  road: ["M7 21 10 3m4 0 3 18M12 5v3m0 4v3m0 4v2"],
  search: ["m20 20-4.5-4.5M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"],
  services: ["M4 4h6v6H4Zm10 0h6v6h-6ZM4 14h6v6H4Zm10 0h6v6h-6Z"],
  support: ["M12 3a8 8 0 0 0-8 8v5h4v-5a4 4 0 0 1 8 0v5h4v-5a8 8 0 0 0-8-8Zm4 13c0 2-1.2 3-4 3"],
  translation: ["M4 5h9m-4-2v2c0 5-2 8-5 10m3-4c1.4 1.8 3 3 5 4m3-7 5 13m-7 0 5-13m-3 8h6"],
  travel: ["M4 18h16M7 18l2-12h6l2 12M9 9h6M8 13h8"],
  plus: ["M12 5v14M5 12h14"],
  minus: ["M5 12h14"],
  close: ["M6 6l12 12M18 6 6 18"],
  check: ["m5 12.5 4.5 4.5L19 7"],
  send: ["M4 12 20 4l-6 16-3-7-7-1Z"],
  phone: ["M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"],
  star: ["m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"],
  clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2"],
  globe: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.7 3.5 5.7 3.5 9s-1 6.3-3.5 9c-2.5-2.7-3.5-5.7-3.5-9s1-6.3 3.5-9Z"],
  shield: ["M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6Z"],
  ticket: ["M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4Zm10 0v10"],
  help: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.5-11.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14m0 3h.01"],
  edit: ["M4 20h4L19 9l-4-4L4 16Zm9-13 4 4"],
  trash: ["M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"],
  sliders: ["M4 7h9M17 7h3M4 17h3M11 17h9", "M15 5a2 2 0 1 1 0 4a2 2 0 1 1 0-4", "M9 15a2 2 0 1 1 0 4a2 2 0 1 1 0-4"],
  refresh: ["M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"],
} as const;

export type ZxIconName = keyof typeof paths;

export function ZxIcon({ name, size = 22, color = "#374151", strokeWidth = 1.85 }: { name: ZxIconName; size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {paths[name].map((d) => <Path key={d} d={d} />)}
    </Svg>
  );
}

export function CartIcon({ size = 18, color = "#374151" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={8} cy={21} r={1} />
      <Circle cx={19} cy={21} r={1} />
      <Path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </Svg>
  );
}
