import { Image } from "expo-image";
import { View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";

/**
 * Hand-drawn service illustrations (soft 3D "clay" style: gradient volumes,
 * specular highlights and a contact shadow) on a 64×64 grid. Drawn in SVG so
 * they stay crisp at every size and ship with no image assets.
 */
export const servicePalettes: Record<string, { tint: string; accent: string }> = {
  food: { tint: "#FFF4E6", accent: "#F08A3C" },
  housing: { tint: "#FFF0EA", accent: "#E5573C" },
  visa: { tint: "#F2EFFE", accent: "#6650D4" },
  "car-rental": { tint: "#E9FAF7", accent: "#12948A" },
  translation: { tint: "#FAF0FC", accent: "#A44FC0" },
  travel: { tint: "#EAF7FE", accent: "#1C8CD1" },
  payment: { tint: "#FFF8E6", accent: "#E59410" },
  community: { tint: "#FFF1EE", accent: "#E2564A" },
  market: { tint: "#F2F8EA", accent: "#5C9A29" },
  emergency: { tint: "#FFEFEF", accent: "#D83A3A" },
  entertainment: { tint: "#FDEFF5", accent: "#E0447F" },
};

const lin = (id: string, from: string, to: string, vertical = true) => (
  <LinearGradient id={id} x1="0" y1="0" x2={vertical ? "0" : "1"} y2="1">
    <Stop offset="0" stopColor={from} />
    <Stop offset="1" stopColor={to} />
  </LinearGradient>
);

const Shadow = ({ rx = 19, cy = 56.5 }: { rx?: number; cy?: number }) => <Ellipse cx={32} cy={cy} rx={rx} ry={3.4} fill="url(#ground)" />;

const GroundDef = () => (
  <RadialGradient id="ground" cx="0.5" cy="0.5" r="0.5">
    <Stop offset="0" stopColor="#0F172A" stopOpacity={0.22} />
    <Stop offset="1" stopColor="#0F172A" stopOpacity={0} />
  </RadialGradient>
);

function Food() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("bowl2", "#7CC7F2", "#2F86C9")}
        {lin("tea", "#F6DDBF", "#D9A06A")}
        {lin("lid", "#FFFFFF", "#E6EEF5")}
        {lin("bunTop", "#FFC56B", "#E08A2E")}
        {lin("bunBot", "#F6B25A", "#D47A26")}
        {lin("patty", "#8A4B2A", "#5C2E17")}
        {lin("stick", "#E9B47A", "#B97A3E", false)}
      </Defs>
      <Shadow rx={26} cy={57} />
      {/* noodle bowl at the back, tucked behind the burger */}
      <G transform="translate(3 9)">
      <Path d="M15 10.5c-1.6-2 1.4-3.2 0-5.4M20 9.5c-1.6-2 1.4-3.2 0-5.4" stroke="#CBD5E1" strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <Path d="M5 17h22c0 6-4.9 10.4-11 10.4S5 23 5 17Z" fill="url(#bowl2)" />
      <Ellipse cx={16} cy={17} rx={11} ry={3.2} fill="#FFF3E2" />
      <Ellipse cx={16} cy={17.3} rx={9.2} ry={2.3} fill="#F4B860" />
      <Path d="M9.5 17.6c1.4-.8 2.6.6 4-.2s2.6.6 4-.2 2.6.6 4-.2" stroke="#FFF7E0" strokeWidth={1.2} strokeLinecap="round" fill="none" />
      <Path d="M22 4.5 15.6 16.8M25.6 6 18.8 17.4" stroke="url(#stick)" strokeWidth={1.8} strokeLinecap="round" />
      </G>
      {/* bubble tea on the right */}
      <Path d="M51 9.5 46.6 20.6" stroke="#FF6FA0" strokeWidth={2.6} strokeLinecap="round" />
      <Path d="M36.6 21.4h20l-2.6 29.4a3.2 3.2 0 0 1-3.2 2.9h-8.4a3.2 3.2 0 0 1-3.2-2.9Z" fill="url(#tea)" />
      <Path d="M36.9 24.6h19.4" stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={1.6} />
      <Circle cx={42} cy={48.6} r={1.9} fill="#3B2416" /><Circle cx={46.6} cy={49.6} r={1.9} fill="#3B2416" /><Circle cx={51} cy={48.4} r={1.9} fill="#3B2416" />
      <Circle cx={44.2} cy={45.4} r={1.9} fill="#3B2416" /><Circle cx={48.8} cy={45.2} r={1.9} fill="#3B2416" />
      <Path d="M39.6 27.5c.4 6 .9 12 1.6 18" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" />
      <Path d="M35.4 21.6c0-3.6 4.9-5.6 11.2-5.6s11.2 2 11.2 5.6Z" fill="url(#lid)" />
      <Rect x={35} y={20.4} width={23.2} height={2.6} rx={1.3} fill="#F1F5F9" />
      {/* burger in front */}
      <Path d="M5.6 50.4h29.8c0 2.6-2 4.4-4.6 4.4H10.2c-2.6 0-4.6-1.8-4.6-4.4Z" fill="url(#bunBot)" />
      <Rect x={5} y={44.6} width={31} height={6.2} rx={3.1} fill="url(#patty)" />
      <Path d="M4.6 44.6h31.8l-3.8 3.6-3.2-2.4-4.4 3.4-3.8-3-4.6 3.4-3.8-3.2-4 2.8Z" fill="#FFCD3C" />
      <Path d="M4.8 42.2c2.4 2.6 4.6 2.6 6.6.6s4.4-2 6.6 0 4.4 2 6.6 0 4.4-2 6.6 0 2.6 1.8 4.6-.6v2.8H4.8Z" fill="#6FCF6A" />
      <Path d="M5 42.4C5 34.6 11.8 29.6 20.6 29.6S36.2 34.6 36.2 42.4Z" fill="url(#bunTop)" />
      <Path d="M11 35.4c1.8-2.4 4.6-3.8 7.8-4.2" stroke="#FFFFFF" strokeOpacity={0.65} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <Ellipse cx={15} cy={36.8} rx={1.1} ry={0.6} fill="#FFF3D6" /><Ellipse cx={21} cy={34.6} rx={1.1} ry={0.6} fill="#FFF3D6" />
      <Ellipse cx={26.4} cy={36.4} rx={1.1} ry={0.6} fill="#FFF3D6" /><Ellipse cx={20.6} cy={38.6} rx={1.1} ry={0.6} fill="#FFF3D6" />
    </>
  );
}

function Housing() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("body", "#FFFDF8", "#F3E4D0")}
        {lin("bodySide", "#EBD5B9", "#D2B48F")}
        {lin("roofFront", "#FF9A7A", "#E5573C")}
        {lin("roofSide", "#F07457", "#C9432C")}
        {lin("doorTeal", "#2FA3A1", "#0E5A63")}
        {lin("warm", "#FFF4C8", "#FFC452")}
        <RadialGradient id="shrub" cx="0.4" cy="0.35" r="0.7">
          <Stop offset="0" stopColor="#8BE29A" />
          <Stop offset="1" stopColor="#2E9E4F" />
        </RadialGradient>
      </Defs>
      <Shadow rx={25} cy={56.5} />
      {/* side wall */}
      <Path d="M42 30.5 53.5 27.2V49.6L42 53.6Z" fill="url(#bodySide)" stroke="url(#bodySide)" strokeWidth={2} strokeLinejoin="round" />
      <Path d="M45.2 35.4 50.4 34v5.6l-5.2 1.5Z" fill="url(#warm)" />
      {/* front body */}
      <Rect x={11} y={29.5} width={31} height={24.5} rx={4} fill="url(#body)" />
      {/* roof: side slope + rounded front gable */}
      <Path d="M27.2 12.6 45.6 7.6 58.4 25.2 44.4 30.4Z" fill="url(#roofSide)" stroke="url(#roofSide)" strokeWidth={2.4} strokeLinejoin="round" />
      <Path d="M28.6 13.4 45 8.8" stroke="#FFB59F" strokeWidth={2} strokeLinecap="round" />
      <Path d="M8.4 32.6c-.9 0-1.4-1-.8-1.7L24.4 13.4c1.6-1.7 4.2-1.7 5.8 0L47 30.9c.6.7.1 1.7-.8 1.7Z" fill="url(#roofFront)" />
      <Path d="M12.6 28.8 25.2 15.4" stroke="#FFC2AE" strokeWidth={2.2} strokeLinecap="round" />
      {/* round gable window */}
      <Circle cx={27.3} cy={24.6} r={3.6} fill="url(#warm)" stroke="#FFFFFF" strokeWidth={1.6} />
      {/* door + window */}
      <Path d="M15.6 54V43.4a4.4 4.4 0 0 1 8.8 0V54Z" fill="url(#doorTeal)" />
      <Circle cx={22.4} cy={48.6} r={0.95} fill="#FFD27A" />
      <Rect x={28.6} y={37.6} width={9.6} height={9} rx={2.4} fill="url(#warm)" stroke="#FFFFFF" strokeWidth={1.6} />
      <Path d="M33.4 38.4v7.4M29.4 42.1h8" stroke="#E6A43B" strokeWidth={1} />
      <Path d="M14 33v6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
      {/* shrubs */}
      <Circle cx={9} cy={51.4} r={4.2} fill="url(#shrub)" />
      <Circle cx={13.4} cy={53.2} r={2.8} fill="url(#shrub)" />
      <Circle cx={55.6} cy={51.6} r={3.6} fill="url(#shrub)" />
      <Circle cx={7.8} cy={49.8} r={1.1} fill="#FFFFFF" opacity={0.55} />
    </>
  );
}

function Visa() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("cover", "#A595F8", "#5640C4", false)}
        {lin("gold", "#FFE19A", "#F0A42E")}
      </Defs>
      <Shadow rx={18} />
      <G rotation={-14} origin="22, 34">
        <Rect x={9} y={19} width={25} height={34} rx={4} fill="#FFF1C9" />
        <Rect x={9} y={19} width={25} height={8.5} rx={4} fill="#F6B83E" />
        <Rect x={13} y={32} width={14} height={2.2} rx={1.1} fill="#E7C27A" />
        <Rect x={13} y={37} width={10} height={2.2} rx={1.1} fill="#E7C27A" />
      </G>
      <Path d="M50.5 12.6h1.6a2.6 2.6 0 0 1 2.6 2.6v32.2a2.6 2.6 0 0 1-2.6 2.6h-1.6Z" fill="#F3F0FF" />
      <Rect x={22} y={9.5} width={30} height={42.5} rx={5} fill="url(#cover)" />
      <Rect x={22} y={9.5} width={5.2} height={42.5} rx={2.6} fill="#3F2DA4" opacity={0.45} />
      <Rect x={22} y={9.5} width={30} height={14} rx={5} fill="#FFFFFF" opacity={0.1} />
      <Circle cx={38.8} cy={26.6} r={7} fill="none" stroke="url(#gold)" strokeWidth={2} />
      <Ellipse cx={38.8} cy={26.6} rx={3.1} ry={7} fill="none" stroke="url(#gold)" strokeWidth={1.5} />
      <Path d="M31.8 26.6h14M33.3 22.6h11M33.3 30.6h11" stroke="url(#gold)" strokeWidth={1.3} />
      <Rect x={31.2} y={38.6} width={15.2} height={2.5} rx={1.25} fill="url(#gold)" />
      <Rect x={33.8} y={43.2} width={10} height={2} rx={1} fill="url(#gold)" opacity={0.75} />
    </>
  );
}

function Car() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("body", "#62E3CF", "#0F8E83")}
        {lin("glass", "#F0FCFF", "#9EDDF0")}
        <RadialGradient id="hub" cx="0.4" cy="0.35" r="0.7">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#94A3B8" />
        </RadialGradient>
      </Defs>
      <Shadow rx={24} cy={54.5} />
      <Path d="M8 40.5c0-4 2.6-7.1 6.6-7.9l4.4-.9 5.2-8.2c1-1.6 2.8-2.6 4.7-2.6h10.7c2 0 3.8 1 4.9 2.6l5.4 8.1 3 .6c3.6.8 6.3 4 6.3 7.7V45c0 1.7-1.3 3-3 3H11c-1.7 0-3-1.3-3-3Z" fill="url(#body)" />
      <Path d="M25.8 24.4c.6-.9 1.6-1.4 2.7-1.4h4.9v9.2H22.1Z" fill="url(#glass)" />
      <Path d="M35.4 23h3.9c1.1 0 2.1.5 2.7 1.4l4.4 7.8H35.4Z" fill="url(#glass)" />
      <Path d="M28.3 25.2 25.6 30" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M34.4 33v10.5" stroke="#0B746B" strokeWidth={1} opacity={0.45} />
      <Path d="M13 36c8.5-1.7 30-1.7 38.5 0" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <Ellipse cx={54} cy={38} rx={2} ry={1.6} fill="#FFE38A" />
      <Rect x={8.6} y={36.4} width={2.4} height={3.6} rx={1.2} fill="#FF7A6B" />
      <Circle cx={19.5} cy={47.5} r={6.2} fill="#1E293B" />
      <Circle cx={19.5} cy={47.5} r={2.9} fill="url(#hub)" />
      <Circle cx={45} cy={47.5} r={6.2} fill="#1E293B" />
      <Circle cx={45} cy={47.5} r={2.9} fill="url(#hub)" />
    </>
  );
}

function Translation() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("back", "#EFAEF6", "#A64CC3", false)}
        {lin("front", "#FFFFFF", "#EEF0FF")}
      </Defs>
      <Shadow rx={18} />
      <Path d="M8 15a7 7 0 0 1 7-7h20a7 7 0 0 1 7 7v12a7 7 0 0 1-7 7H21.5l-7.3 6.2V33.6A7 7 0 0 1 8 27Z" fill="url(#back)" />
      <Path d="M12 14.4a3.6 3.6 0 0 1 3.6-3.6h6" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d="M16.8 16.2h16.4M25 13v3.2M19.6 16.2c1.2 5 4.5 8.4 10.6 9.9M30.6 16.2c-1.4 5-5 8.4-11.2 9.9" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <Path d="M24 33a7 7 0 0 1 7-7h19a7 7 0 0 1 7 7v11a7 7 0 0 1-7 7h-1.6v6.4L40.9 51H31a7 7 0 0 1-7-7Z" fill="url(#front)" stroke="#E2E8F0" strokeWidth={1} />
      <Path d="M34.4 46.2 40.5 31.6l6.1 14.6M36.7 40.8h7.6" stroke="#8E3FB2" strokeWidth={2.7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  );
}

function Travel() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("case", "#74DAFB", "#1A80CB", false)}
      </Defs>
      <Shadow rx={18} />
      <Path d="M25 16v-4a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4" stroke="#1E3A5F" strokeWidth={3.2} strokeLinecap="round" fill="none" />
      <Rect x={14} y={15} width={36} height={35} rx={7} fill="url(#case)" />
      <Rect x={23} y={15} width={3} height={35} fill="#FFFFFF" opacity={0.22} />
      <Rect x={38} y={15} width={3} height={35} fill="#FFFFFF" opacity={0.22} />
      <Rect x={14} y={15} width={36} height={12} rx={7} fill="#FFFFFF" opacity={0.16} />
      <Circle cx={31.5} cy={35.5} r={6.2} fill="#FFFFFF" />
      <G transform="translate(26.9 30.9) scale(0.385)">
        <Path d="M21 15.2v-1.7l-7.6-4.8V4.4a1.4 1.4 0 0 0-2.8 0v4.3L3 13.5v1.7l7.6-2.3v4.8l-2.1 1.5V21l3.5-1 3.5 1v-1.8l-2.1-1.5v-4.8Z" fill="#1A80CB" />
      </G>
      <Circle cx={44} cy={23.6} r={3.8} fill="#FFD25E" />
      <Path d="M44 21.6v4M42 23.6h4" stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" />
      <Circle cx={21} cy={52.6} r={2.6} fill="#1E293B" />
      <Circle cx={43} cy={52.6} r={2.6} fill="#1E293B" />
    </>
  );
}

function Payment() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("wallet", "#FFD772", "#E58D0C")}
        {lin("flap", "#F2A51F", "#C3740A")}
        {lin("card", "#7CC0FF", "#2E6ED0", false)}
        <RadialGradient id="snap" cx="0.4" cy="0.35" r="0.7">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#C7D0DC" />
        </RadialGradient>
      </Defs>
      <Shadow rx={21} />
      <G rotation={6} origin="35, 20">
        <Rect x={22} y={12} width={26} height={15} rx={2.5} fill="#7FDBA5" />
        <Circle cx={35} cy={19.5} r={3.2} fill="#FFFFFF" opacity={0.55} />
      </G>
      <G rotation={-9} origin="30, 19">
        <Rect x={15} y={10} width={28} height={18} rx={3.5} fill="url(#card)" />
        <Rect x={19} y={14} width={5.4} height={4.2} rx={1} fill="#FFD27A" />
      </G>
      <Rect x={9} y={22} width={46} height={29} rx={7} fill="url(#wallet)" />
      <Path d="M15 23.6h34" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M13.5 27h22" stroke="#FFF3C4" strokeOpacity={0.75} strokeWidth={1} strokeDasharray="2 2" />
      <Path d="M36 30h17a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H36a7 7 0 0 1 0-14Z" fill="url(#flap)" />
      <Circle cx={38.5} cy={37} r={2.7} fill="url(#snap)" />
    </>
  );
}

function Community() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("c", "#FF9C85", "#DB4A3F")}
        {lin("l", "#FFDB8C", "#F2A21E")}
        {lin("r", "#9FDBFF", "#3E97DE")}
      </Defs>
      <Shadow rx={24} />
      <Circle cx={15.5} cy={29.5} r={5.6} fill="url(#l)" />
      <Path d="M6 46.5a9.5 9.5 0 0 1 19 0v3H6Z" fill="url(#l)" />
      <Circle cx={48.5} cy={29.5} r={5.6} fill="url(#r)" />
      <Path d="M39 46.5a9.5 9.5 0 0 1 19 0v3H39Z" fill="url(#r)" />
      <Circle cx={32} cy={25} r={7.4} fill="url(#c)" />
      <Path d="M18.5 49a13.5 13.5 0 0 1 27 0v2.6h-27Z" fill="url(#c)" />
      <Ellipse cx={29.5} cy={22.2} rx={2.4} ry={1.6} fill="#FFFFFF" opacity={0.5} />
      <Ellipse cx={13.8} cy={27.6} rx={1.8} ry={1.2} fill="#FFFFFF" opacity={0.5} />
      <Ellipse cx={46.8} cy={27.6} rx={1.8} ry={1.2} fill="#FFFFFF" opacity={0.5} />
      <Path d="M32 14.6c-3-2.2-4.6-3.8-4.6-5.6a2.4 2.4 0 0 1 4.6-1 2.4 2.4 0 0 1 4.6 1c0 1.8-1.6 3.4-4.6 5.6Z" fill="#FF5A7A" />
    </>
  );
}

function Market() {
  const stripe = 46 / 6;
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("shop", "#FFFBF2", "#F1DEBE")}
        {lin("win", "#E3F5FF", "#98CBEE")}
        {lin("mdoor", "#82C770", "#4A8A36")}
      </Defs>
      <Shadow rx={22} />
      <Rect x={12} y={24} width={40} height={29} rx={3} fill="url(#shop)" />
      <Rect x={16} y={33.5} width={14} height={11} rx={2} fill="url(#win)" />
      <Path d="M16.5 40h13" stroke="#FFFFFF" strokeWidth={1.2} opacity={0.8} />
      <Rect x={34.5} y={33.5} width={13} height={19.5} rx={2} fill="url(#mdoor)" />
      <Circle cx={44.6} cy={43.5} r={0.95} fill="#FFE08A" />
      {Array.from({ length: 6 }, (_, i) => {
        const color = i % 2 ? "#FFFFFF" : "#FF5A5A";
        return (
          <G key={i}>
            <Rect x={9 + i * stripe} y={16} width={stripe + 0.2} height={10} fill={color} />
            <Circle cx={9 + i * stripe + stripe / 2} cy={26} r={stripe / 2} fill={color} />
          </G>
        );
      })}
      <Rect x={8} y={12.8} width={48} height={4.6} rx={2.3} fill="#E23B3B" />
      <Rect x={22} y={5.5} width={20} height={7.5} rx={3.75} fill="#FFD25E" />
      <Path d="M27 9.2h10" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" />
    </>
  );
}

function Emergency() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("shield", "#FF8D8D", "#CF2F2F", false)}
      </Defs>
      <Shadow rx={17} />
      <Path d="M32 6.5 51 13.6v14.2c0 12.6-8 21.6-19 25.7-11-4.1-19-13.1-19-25.7V13.6Z" fill="url(#shield)" />
      <Path d="M32 10.2 47.8 16.1v11.8c0 10.6-6.6 18.3-15.8 21.9-9.2-3.6-15.8-11.3-15.8-21.9V16.1Z" fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.5} />
      <Path d="M28.5 20h7v7.5H43v7h-7.5V42h-7v-7.5H21v-7h7.5Z" fill="#B42318" opacity={0.25} transform="translate(0 1.2)" />
      <Path d="M28.5 20h7v7.5H43v7h-7.5V42h-7v-7.5H21v-7h7.5Z" fill="#FFFFFF" />
      <Path d="M17.5 16.6 29.5 12" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2.4} strokeLinecap="round" />
    </>
  );
}

function Fallback() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("a", "#7EE3B5", "#14A86F")}
        {lin("b", "#FFD772", "#F09A12")}
        {lin("c2", "#7CC0FF", "#2E6ED0")}
        {lin("d", "#FFA08A", "#E2564A")}
      </Defs>
      <Shadow rx={20} />
      <Rect x={12} y={10} width={18} height={18} rx={5.5} fill="url(#a)" />
      <Rect x={34} y={10} width={18} height={18} rx={5.5} fill="url(#b)" />
      <Rect x={12} y={32} width={18} height={18} rx={5.5} fill="url(#c2)" />
      <Rect x={34} y={32} width={18} height={18} rx={5.5} fill="url(#d)" />
    </>
  );
}

/* ---- Property facts (housing detail): bed, bathtub, floor plan in the same clay style ---- */

function Bed() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("headboard", "#D9AE7E", "#A06D3F")}
        {lin("frame", "#F4F7FB", "#C9D5E4")}
        {lin("duvet", "#8CC2FA", "#3874D6")}
        {lin("pillow", "#FFFFFF", "#E3EAF4")}
      </Defs>
      <Shadow rx={24} cy={55.5} />
      <Rect x={10} y={12} width={44} height={26} rx={8} fill="url(#headboard)" />
      <Path d="M15 17.5c4-2.4 10-3.2 16-3" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <Rect x={9} y={47} width={4} height={6} rx={1.6} fill="#8A5A31" />
      <Rect x={51} y={47} width={4} height={6} rx={1.6} fill="#8A5A31" />
      <Rect x={6} y={33} width={52} height={16} rx={5.5} fill="url(#frame)" />
      <Rect x={13.5} y={23.5} width={16} height={9.5} rx={4.6} fill="url(#pillow)" />
      <Rect x={34.5} y={23.5} width={16} height={9.5} rx={4.6} fill="url(#pillow)" />
      <Path d="M6 36.5c0-2.2 1.8-4 4-4h44c2.2 0 4 1.8 4 4V42c0 2.8-2.2 5-5 5H11c-2.8 0-5-2.2-5-5Z" fill="url(#duvet)" />
      <Path d="M6.4 36.6c0-2 1.7-3.6 3.7-3.6h43.8c2 0 3.7 1.6 3.7 3.6v1.6H6.4Z" fill="#FFFFFF" opacity={0.92} />
      <Path d="M12 42.5c8 1.6 24 1.6 38 0" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </>
  );
}

function Bath() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("tub", "#FFFFFF", "#D4E1F0")}
        {lin("chrome", "#E9EEF4", "#8A98AA", false)}
        {lin("water", "#9BE1FA", "#3BB0E6")}
        {lin("brass", "#F7D27A", "#C8932E")}
      </Defs>
      <Shadow rx={22} />
      <Path d="M51 29V13.5c0-3.4-2.4-5.5-5.4-5.5S40.4 10 40.4 13" stroke="url(#chrome)" strokeWidth={3.2} strokeLinecap="round" fill="none" />
      <Rect x={53} y={18} width={6} height={3} rx={1.5} fill="#8A98AA" />
      <Circle cx={22} cy={24} r={5.4} fill="#FFFFFF" stroke="#CDEBFA" strokeWidth={1.2} />
      <Circle cx={30.5} cy={20.5} r={6.6} fill="#FFFFFF" stroke="#CDEBFA" strokeWidth={1.2} />
      <Circle cx={40} cy={23.5} r={5.6} fill="#FFFFFF" stroke="#CDEBFA" strokeWidth={1.2} />
      <Circle cx={46.5} cy={17} r={2.6} fill="#FFFFFF" stroke="#CDEBFA" strokeWidth={1} />
      <Circle cx={15.5} cy={18.5} r={2} fill="#FFFFFF" stroke="#CDEBFA" strokeWidth={1} />
      <Ellipse cx={17} cy={52.5} rx={3.6} ry={2.6} fill="url(#brass)" />
      <Ellipse cx={47} cy={52.5} rx={3.6} ry={2.6} fill="url(#brass)" />
      <Path d="M8 31h48v3.5C56 44 49 51 39.5 51h-15C15 51 8 44 8 34.5Z" fill="url(#tub)" />
      <Rect x={6} y={27.5} width={52} height={6} rx={3} fill="#F7FAFD" />
      <Rect x={9} y={28.6} width={46} height={3.2} rx={1.6} fill="url(#water)" />
      <Path d="M13 37.5c1.2 5.2 5.4 8.8 11 9.6" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" fill="none" />
    </>
  );
}

function FloorArea() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("plan", "#F2F7FE", "#CFDFF5")}
        {lin("ruler", "#FFDB7A", "#EFA235")}
      </Defs>
      <Shadow rx={21} />
      <Rect x={7} y={8} width={42} height={42} rx={9} fill="url(#plan)" />
      <Path d="M10.5 12.5c3-2 8-2.6 13-2.4" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <Rect x={13} y={14} width={30} height={30} rx={3} fill="none" stroke="#4F86D6" strokeWidth={2.4} />
      <Path d="M13 30h10M29 14v11M29 31v13M36 31h7" stroke="#4F86D6" strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M23 30a6 6 0 0 1 6-6" stroke="#9CBCEB" strokeWidth={1.5} fill="none" strokeDasharray="2 2" />
      <G transform="rotate(-32 41 45)">
        <Rect x={21} y={40} width={41} height={10.5} rx={3.2} fill="url(#ruler)" />
        <Path d="M25 40v4M29.5 40v2.6M34 40v4M38.5 40v2.6M43 40v4M47.5 40v2.6M52 40v4M56.5 40v2.6" stroke="#9A5B12" strokeWidth={1.4} strokeLinecap="round" />
        <Path d="M23 47.4h36" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1.4} strokeLinecap="round" />
      </G>
    </>
  );
}

const factArt = { bed: Bed, bath: Bath, area: FloorArea } as const;
export type FactArtKind = keyof typeof factArt;

/** Clay illustration for a housing fact tile (bedrooms, bathrooms, floor area). */
export function FactArt({ kind, size = 36 }: { kind: FactArtKind; size?: number }) {
  const Art = factArt[kind];
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Art />
    </Svg>
  );
}

/* ---- Profile / settings menu: same clay style, one object per row ---- */

function Parcel() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("boxFront", "#E9B57A", "#C98445")}
        {lin("boxSide", "#D39A5C", "#A9692F")}
        {lin("boxTop", "#F6D2A2", "#E5AE6E")}
      </Defs>
      <Shadow rx={22} />
      <Path d="M10 22 32 31v23L10 45Z" fill="url(#boxFront)" />
      <Path d="M54 22 32 31v23l22-9Z" fill="url(#boxSide)" />
      <Path d="M10 22 32 13l22 9-22 9Z" fill="url(#boxTop)" />
      <Path d="M21 17.5 43 26.5v9l-5 2v-9L16 19.6Z" fill="#FFF3DE" opacity={0.92} />
      <Path d="M13.5 27.5c.8 5 1 9.6.6 14" stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={2} strokeLinecap="round" fill="none" />
    </>
  );
}

function StarBadge() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("star", "#FFE07A", "#F2A516")}
      </Defs>
      <Shadow rx={17} />
      <Path d="M32 7.5l7.2 14.6 16.1 2.3-11.6 11.4 2.7 16-14.4-7.6-14.4 7.6 2.7-16L8.7 24.4l16.1-2.3Z" fill="url(#star)" stroke="#E8960F" strokeWidth={1.2} strokeLinejoin="round" />
      <Path d="M29.5 15.5 26.6 22c-.4.9-1.3 1.6-2.3 1.7l-6.5 1" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2.4} strokeLinecap="round" fill="none" />
    </>
  );
}

function Clock() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("rim", "#5FC7C0", "#1E7F86")}
        <RadialGradient id="face" cx="0.4" cy="0.35" r="0.7">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E3EEF1" />
        </RadialGradient>
      </Defs>
      <Shadow rx={18} />
      <Circle cx={32} cy={31} r={22} fill="url(#rim)" />
      <Circle cx={32} cy={31} r={17.5} fill="url(#face)" />
      <Path d="M32 18.5v2.6M32 40.9v2.6M19.5 31h2.6M41.9 31h2.6" stroke="#9FB4BC" strokeWidth={2} strokeLinecap="round" />
      <Path d="M32 31V22.5M32 31l6.5 4" stroke="#18323A" strokeWidth={3} strokeLinecap="round" />
      <Circle cx={32} cy={31} r={2.4} fill="#EC5B2C" />
      <Path d="M16.5 22c2.6-4.4 7-7.4 12-8.2" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={2.4} strokeLinecap="round" fill="none" />
    </>
  );
}

function Ticket() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("ticket", "#FF9A6B", "#E8492F", false)}
      </Defs>
      <Shadow rx={22} />
      <G transform="rotate(-12 32 32)">
        <Path d="M9 19h46v8.5a4.5 4.5 0 0 0 0 9V45H9v-8.5a4.5 4.5 0 0 0 0-9Z" fill="url(#ticket)" />
        <Path d="M40 21.5v21" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={1.8} strokeDasharray="3 3" />
        <Path d="M17 28.5h15M17 34.5h10" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
        <Path d="M47.5 28l-3 8" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" />
        <Circle cx={45} cy={29.3} r={1.5} fill="#FFFFFF" />
        <Circle cx={47.8} cy={35} r={1.5} fill="#FFFFFF" />
        <Path d="M12.5 22h12" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.8} strokeLinecap="round" />
      </G>
    </>
  );
}

function Bell() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("bell", "#FFD66E", "#E99A12")}
      </Defs>
      <Shadow rx={17} />
      <Circle cx={32} cy={47} r={5} fill="#C97A0C" />
      <Path d="M32 9.5c-9.5 0-15 7.2-15 16.5v8.6l-4.4 6.2c-.8 1.2 0 2.7 1.4 2.7h36c1.4 0 2.2-1.5 1.4-2.7L47 34.6V26c0-9.3-5.5-16.5-15-16.5Z" fill="url(#bell)" />
      <Circle cx={32} cy={8.5} r={3} fill="#E99A12" />
      <Path d="M22.5 22c1.2-4.6 4.4-7.4 8.4-8" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2.6} strokeLinecap="round" fill="none" />
    </>
  );
}

function Globe() {
  return (
    <>
      <Defs>
        <GroundDef />
        <RadialGradient id="globe" cx="0.38" cy="0.32" r="0.75">
          <Stop offset="0" stopColor="#8FD3FF" />
          <Stop offset="1" stopColor="#2F72D2" />
        </RadialGradient>
      </Defs>
      <Shadow rx={18} />
      <Circle cx={32} cy={31} r={21} fill="url(#globe)" />
      <Path d="M18 21c4 2 6 6 4 9s1 6 5 6 3 6 1 9M38 12c-2 4 0 7 4 8s6 5 3 9-1 8 3 9" stroke="#7FD8A6" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.9} />
      <Ellipse cx={32} cy={31} rx={9} ry={21} fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.4} />
      <Path d="M11 31h42" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.4} />
      <Path d="M18 19c3-4 7.6-6.6 12.6-7.2" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={2.6} strokeLinecap="round" fill="none" />
    </>
  );
}

function Shield() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("shield", "#8C9BFF", "#4B4FD1")}
      </Defs>
      <Shadow rx={17} />
      <Path d="M32 7.5 51 14v14.5C51 40 43 48.6 32 53 21 48.6 13 40 13 28.5V14Z" fill="url(#shield)" />
      <Path d="M32 11.8 47 17v11.5c0 9-6.1 16-15 19.8Z" fill="#FFFFFF" opacity={0.12} />
      <Path d="m23.5 30.5 6 6 11.5-12.5" stroke="#FFFFFF" strokeWidth={4.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M17.5 17.5c2.4-.9 4.8-1.7 7.2-2.5" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={2.4} strokeLinecap="round" />
    </>
  );
}

function Siren() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("dome", "#FF8A80", "#D7262B")}
        {lin("base", "#4A5568", "#1F2937")}
      </Defs>
      <Shadow rx={19} />
      <Path d="M8 14l5 4M56 14l-5 4M32 4v6M4 30h6M54 30h6" stroke="#F59E0B" strokeWidth={3} strokeLinecap="round" />
      <Path d="M18 44V32c0-8 6.3-14 14-14s14 6 14 14v12Z" fill="url(#dome)" />
      <Rect x={13} y={43} width={38} height={8} rx={3} fill="url(#base)" />
      <Path d="M24 33c0-4.4 3-8 7-8.6" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Rect x={29.5} y={30} width={5} height={10} rx={2.5} fill="#FFE1DE" />
    </>
  );
}

function PhonePush() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("phone", "#4B5563", "#111827")}
        {lin("screen", "#7DD3C8", "#2B8A8E")}
      </Defs>
      <Shadow rx={15} />
      <Rect x={18} y={6} width={28} height={48} rx={7} fill="url(#phone)" />
      <Rect x={20.5} y={9} width={23} height={42} rx={5} fill="url(#screen)" />
      <Rect x={23} y={18} width={18} height={7} rx={2.5} fill="#FFFFFF" opacity={0.92} />
      <Rect x={23} y={28} width={18} height={7} rx={2.5} fill="#FFFFFF" opacity={0.6} />
    </>
  );
}

function Megaphone() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("horn", "#FFB067", "#F0602A")}
      </Defs>
      <Shadow rx={19} />
      <Path d="M22 39l4 12c.4 1.3 1.8 2 3.1 1.6l3-1c1.3-.4 2-1.8 1.6-3.1L30 38" fill="#C2410C" />
      <Path d="M12 26c0-2 1.6-3.5 3.5-3.5H22L46 11v38L22 37.5h-6.5C13.6 37.5 12 36 12 34Z" fill="url(#horn)" />
      <Ellipse cx={46} cy={30} rx={4.5} ry={19} fill="#FFD3AE" />
      <Path d="M52 22c2.2 2.4 2.2 13.6 0 16M56.5 18c3.6 4 3.6 20 0 24" stroke="#F59E0B" strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <Path d="M16 26.5h5" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={2.4} strokeLinecap="round" />
    </>
  );
}

function Lifebuoy() {
  return (
    <>
      <Defs>
        <GroundDef />
        <RadialGradient id="ring" cx="0.4" cy="0.35" r="0.7">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#DCE5EE" />
        </RadialGradient>
        {lin("band", "#FF7A6B", "#D9332B")}
      </Defs>
      <Shadow rx={19} />
      <Circle cx={32} cy={31} r={21} fill="url(#ring)" />
      <Path d="M17.2 16.2a21 21 0 0 1 9.4-5.5l2.6 10.6a10 10 0 0 0-4.3 2.6Z M46.8 16.2a21 21 0 0 1 5.5 9.4l-10.6 2.6a10 10 0 0 0-2.6-4.3Z M46.8 45.8a21 21 0 0 1-9.4 5.5l-2.6-10.6a10 10 0 0 0 4.3-2.6Z M17.2 45.8a21 21 0 0 1-5.5-9.4l10.6-2.6a10 10 0 0 0 2.6 4.3Z" fill="url(#band)" />
      <Circle cx={32} cy={31} r={10} fill="#F1F6FA" />
      <Circle cx={32} cy={31} r={10} fill="none" stroke="#C7D3DF" strokeWidth={1.4} />
      <Path d="M15.5 24c1.6-4 4.4-7.2 8-9.2" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" fill="none" />
    </>
  );
}

function ChatHeart() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("bubble", "#6EE7B7", "#10A37F")}
      </Defs>
      <Shadow rx={19} />
      <Path d="M14 10h36c3.3 0 6 2.7 6 6v20c0 3.3-2.7 6-6 6H29l-10 9v-9h-5c-3.3 0-6-2.7-6-6V16c0-3.3 2.7-6 6-6Z" fill="url(#bubble)" />
      <Path d="M32 34.5c-5.6-3.8-8.5-6.8-8.5-10 0-2.4 1.9-4.2 4.2-4.2 1.8 0 3.3 1 4.3 2.6 1-1.6 2.5-2.6 4.3-2.6 2.3 0 4.2 1.8 4.2 4.2 0 3.2-2.9 6.2-8.5 10Z" fill="#FFFFFF" />
      <Path d="M13 16.5c.6-1.9 2.2-3 4.2-3h6" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={2.4} strokeLinecap="round" fill="none" />
    </>
  );
}

/* ---- Extra clay pictograms used across screens in place of emoji ---- */

function Pin() {
  return (
    <>
      <Defs><GroundDef />{lin("pin", "#FF7A6B", "#D7262B")}</Defs>
      <Shadow rx={12} cy={57} />
      <Path d="M32 56s-17-15.6-17-29.5C15 16.8 22.6 9 32 9s17 7.8 17 17.5C49 40.4 32 56 32 56Z" fill="url(#pin)" />
      <Circle cx={32} cy={26.5} r={7} fill="#FFFFFF" />
      <Path d="M22 18.5c2-3.4 5.4-5.6 9.4-6" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={2.6} strokeLinecap="round" fill="none" />
    </>
  );
}

function People() {
  return (
    <>
      <Defs><GroundDef />{lin("p1", "#7CC4FF", "#2F72D2")}{lin("p2", "#8EE3C8", "#16A085")}{lin("skin", "#FFE1C4", "#F2B488")}</Defs>
      <Shadow rx={22} />
      <Circle cx={22} cy={22} r={7.5} fill="url(#skin)" />
      <Path d="M8 52c0-9.4 6.3-16 14-16s14 6.6 14 16Z" fill="url(#p2)" />
      <Circle cx={41} cy={20} r={8.5} fill="url(#skin)" />
      <Path d="M25 53c0-10.6 7.2-18 16-18s16 7.4 16 18Z" fill="url(#p1)" />
      <Path d="M31 42c1.6-2.4 3.8-4 6.4-4.6" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2.4} strokeLinecap="round" fill="none" />
    </>
  );
}

function Store() {
  return (
    <>
      <Defs><GroundDef />{lin("wall2", "#FFFFFF", "#E3EAF2")}{lin("awn", "#FF8A6B", "#E2482F")}</Defs>
      <Shadow rx={22} />
      <Rect x={12} y={26} width={40} height={27} rx={3} fill="url(#wall2)" />
      <Rect x={18} y={34} width={12} height={19} rx={2} fill="#2F72D2" />
      <Rect x={34} y={34} width={12} height={10} rx={2} fill="#9BD3F7" />
      <Path d="M9 18l4-8h38l4 8v4a5.5 5.5 0 0 1-11 0 5.5 5.5 0 0 1-11 0 5.5 5.5 0 0 1-11 0 5.5 5.5 0 0 1-11 0Z" fill="url(#awn)" />
      <Path d="M20 10l-2 12M32 10v12M44 10l2 12" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2.4} />
    </>
  );
}

function SparkleArt() {
  return (
    <>
      <Defs><GroundDef />{lin("spk", "#FFE07A", "#F2A516")}{lin("spk2", "#B9A8FF", "#7B61FF")}</Defs>
      <Shadow rx={14} />
      <Path d="M28 8c1.6 11.4 6.6 16.4 18 18-11.4 1.6-16.4 6.6-18 18-1.6-11.4-6.6-16.4-18-18 11.4-1.6 16.4-6.6 18-18Z" fill="url(#spk)" />
      <Path d="M47 34c.8 5.4 3.2 7.8 8.6 8.6-5.4.8-7.8 3.2-8.6 8.6-.8-5.4-3.2-7.8-8.6-8.6 5.4-.8 7.8-3.2 8.6-8.6Z" fill="url(#spk2)" />
    </>
  );
}

function Heart() {
  return (
    <>
      <Defs><GroundDef />{lin("heart", "#FF8FA3", "#E8364F")}</Defs>
      <Shadow rx={17} />
      <Path d="M32 53C14 41 8 32 8 23.5 8 16 13.8 10 21 10c4.6 0 8.6 2.4 11 6 2.4-3.6 6.4-6 11-6 7.2 0 13 6 13 13.5C56 32 50 41 32 53Z" fill="url(#heart)" />
      <Path d="M15 21c.6-3.6 3.4-6 6.8-6" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2.8} strokeLinecap="round" fill="none" />
    </>
  );
}

function Bookmark() {
  return (
    <>
      <Defs><GroundDef />{lin("bm", "#7CC4FF", "#2F72D2")}</Defs>
      <Shadow rx={14} />
      <Path d="M18 9h28c1.7 0 3 1.3 3 3v42l-17-11-17 11V12c0-1.7 1.3-3 3-3Z" fill="url(#bm)" />
      <Path d="M22 14v14" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={2.6} strokeLinecap="round" />
    </>
  );
}

function Scooter() {
  return (
    <>
      <Defs><GroundDef />{lin("sc", "#FF9A6B", "#E8492F")}</Defs>
      <Shadow rx={24} cy={56} />
      <Circle cx={15} cy={45} r={8} fill="#1F2937" /><Circle cx={15} cy={45} r={3.4} fill="#CBD5E1" />
      <Circle cx={49} cy={45} r={8} fill="#1F2937" /><Circle cx={49} cy={45} r={3.4} fill="#CBD5E1" />
      <Path d="M12 40c1-7 6-11 13-11h9l4 11H12Z" fill="url(#sc)" />
      <Path d="M38 40l6-22h6" stroke="#475569" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Rect x={20} y={23} width={14} height={5} rx={2.5} fill="#1F2937" />
      <Rect x={6} y={18} width={12} height={10} rx={2} fill="#F2B53A" />
    </>
  );
}

function Truck() {
  return (
    <>
      <Defs><GroundDef />{lin("box2", "#FFFFFF", "#DCE5EE")}{lin("cab", "#4FB8A8", "#127A6E")}</Defs>
      <Shadow rx={25} cy={56} />
      <Rect x={5} y={16} width={34} height={27} rx={3} fill="url(#box2)" />
      <Path d="M39 24h10l8 9v10H39Z" fill="url(#cab)" />
      <Path d="M42 27h6l5 6H42Z" fill="#C9F1EC" />
      <Circle cx={16} cy={45} r={6.5} fill="#1F2937" /><Circle cx={16} cy={45} r={2.6} fill="#CBD5E1" />
      <Circle cx={47} cy={45} r={6.5} fill="#1F2937" /><Circle cx={47} cy={45} r={2.6} fill="#CBD5E1" />
      <Path d="M10 22h20" stroke="#0FAF7A" strokeWidth={3} strokeLinecap="round" />
    </>
  );
}

function Compass() {
  return (
    <>
      <Defs><GroundDef />{lin("cmp", "#5FC7C0", "#1E7F86")}</Defs>
      <Shadow rx={18} />
      <Circle cx={32} cy={31} r={22} fill="url(#cmp)" />
      <Circle cx={32} cy={31} r={17} fill="#F4FAFB" />
      <Path d="M32 16l5 15h-10Z" fill="#E8364F" />
      <Path d="M32 46l-5-15h10Z" fill="#94A3B8" />
      <Circle cx={32} cy={31} r={2.6} fill="#1F2937" />
    </>
  );
}

function CardArt() {
  return (
    <>
      <Defs><GroundDef />{lin("card", "#8C9BFF", "#4B4FD1", false)}</Defs>
      <Shadow rx={22} />
      <G transform="rotate(-10 32 32)">
        <Rect x={8} y={16} width={48} height={32} rx={6} fill="url(#card)" />
        <Rect x={8} y={23} width={48} height={6} fill="#1E1B4B" opacity={0.55} />
        <Rect x={14} y={35} width={10} height={7} rx={1.6} fill="#FFD36B" />
        <Path d="M30 39h18" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2.4} strokeLinecap="round" />
      </G>
    </>
  );
}

function Calendar() {
  return (
    <>
      <Defs><GroundDef />{lin("calTop", "#FF7A6B", "#D7262B")}</Defs>
      <Shadow rx={19} />
      <Rect x={10} y={13} width={44} height={40} rx={7} fill="#FFFFFF" stroke="#DCE5EE" strokeWidth={1.2} />
      <Path d="M10 20c0-3.9 3.1-7 7-7h30c3.9 0 7 3.1 7 7v6H10Z" fill="url(#calTop)" />
      <Rect x={20} y={8} width={4} height={10} rx={2} fill="#475569" /><Rect x={40} y={8} width={4} height={10} rx={2} fill="#475569" />
      <Path d="M18 34h6M29 34h6M40 34h6M18 43h6M29 43h6" stroke="#94A3B8" strokeWidth={3.4} strokeLinecap="round" />
      <Rect x={38} y={39} width={10} height={8} rx={2} fill="#0FAF7A" />
    </>
  );
}

function Check() {
  return (
    <>
      <Defs><GroundDef /><RadialGradient id="ok" cx="0.4" cy="0.35" r="0.7"><Stop offset="0" stopColor="#5BE3A4" /><Stop offset="1" stopColor="#0E9F63" /></RadialGradient></Defs>
      <Shadow rx={17} />
      <Circle cx={32} cy={30} r={21} fill="url(#ok)" />
      <Path d="m22 30 7 7 13-14" stroke="#FFFFFF" strokeWidth={4.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M17 21c2.4-4 6.4-6.8 11-7.4" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2.4} strokeLinecap="round" fill="none" />
    </>
  );
}

function Magnifier() {
  return (
    <>
      <Defs><GroundDef />{lin("handle", "#4B5563", "#111827")}<RadialGradient id="lens2" cx="0.38" cy="0.35" r="0.7"><Stop offset="0" stopColor="#E6F6FF" /><Stop offset="1" stopColor="#9BD3F7" /></RadialGradient></Defs>
      <Shadow rx={18} />
      <Path d="M38 38l14 14" stroke="url(#handle)" strokeWidth={7} strokeLinecap="round" />
      <Circle cx={27} cy={26} r={16} fill="url(#lens2)" stroke="#2F72D2" strokeWidth={4} />
      <Path d="M19 22c1.4-3.4 4.2-5.6 7.6-6" stroke="#FFFFFF" strokeWidth={2.8} strokeLinecap="round" fill="none" />
    </>
  );
}

function Pencil() {
  return (
    <>
      <Defs><GroundDef />{lin("pen", "#FFD36B", "#F0A21C", false)}</Defs>
      <Shadow rx={18} />
      <G transform="rotate(45 32 32)">
        <Rect x={26} y={8} width={12} height={36} rx={2} fill="url(#pen)" />
        <Rect x={26} y={4} width={12} height={7} rx={3} fill="#FF8FA3" />
        <Rect x={26} y={10} width={12} height={3} fill="#CBD5E1" />
        <Path d="M26 44h12l-6 12Z" fill="#F6D9B3" />
        <Path d="M30 52h4l-2 4Z" fill="#1F2937" />
      </G>
    </>
  );
}

function Play() {
  return (
    <>
      <Defs><GroundDef />{lin("play", "#FF7A6B", "#D7262B")}</Defs>
      <Shadow rx={17} />
      <Circle cx={32} cy={30} r={21} fill="url(#play)" />
      <Path d="M27 20.5v19c0 1.4 1.5 2.2 2.7 1.5l14.6-9.5c1-.7 1-2.3 0-3l-14.6-9.5c-1.2-.7-2.7.1-2.7 1.5Z" fill="#FFFFFF" />
    </>
  );
}

const menuArt = {
  orders: Parcel, favorites: StarBadge, history: Clock, coupons: Ticket, notifications: Bell, language: Globe,
  security: Shield, emergency: Siren, push: PhonePush, promotions: Megaphone, help: Lifebuoy, feedback: ChatHeart,
} as const;
export type MenuArtKind = keyof typeof menuArt;

const extraArt = {
  pin: Pin, people: People, store: Store, sparkle: SparkleArt, heart: Heart, bookmark: Bookmark, scooter: Scooter, truck: Truck,
  compass: Compass, card: CardArt, calendar: Calendar, check: Check, search: Magnifier, pencil: Pencil, play: Play,
} as const;
const allArt = { ...menuArt, ...extraArt, bed: Bed, bath: Bath, area: FloorArea } as const;
export type ArtKind = keyof typeof allArt;

/** Any clay pictogram (menu, facts, extras) bare, at `size` points. Use instead of emoji. */
export function Art3D({ kind, size = 24 }: { kind: ArtKind; size?: number }) {
  const Art = allArt[kind];
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Art />
    </Svg>
  );
}
// Glow colour behind each menu illustration (soft, borderless halo).
const menuGlow: Record<MenuArtKind, string> = {
  orders: "#F2A65A", favorites: "#F7C531", history: "#3FB3AE", coupons: "#F26B4A", notifications: "#F5B524", language: "#4B92E8",
  security: "#6D6CF0", emergency: "#EF5350", push: "#2FA39F", promotions: "#F58A3C", help: "#EF6F6F", feedback: "#22B98A",
};

/** Borderless, blurred colour halo that sits behind an illustration instead of a hard tile. */
export function SoftGlow({ color, size, opacity = 0.32 }: { color: string; size: number; opacity?: number }) {
  return (
    <Svg pointerEvents="none" width={size} height={size} style={{ position: "absolute" }}>
      <Defs>
        <RadialGradient id="glow" cx="0.5" cy="0.52" r="0.5">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.45} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#glow)" />
    </Svg>
  );
}

/** Clay menu illustration on a soft blurred halo (profile / settings rows). */
export function MenuArt({ kind, size = 40 }: { kind: MenuArtKind; size?: number }) {
  const Art = menuArt[kind];
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <SoftGlow color={menuGlow[kind]} size={size * 1.35} />
      <Svg width={size * 0.86} height={size * 0.86} viewBox="0 0 64 64">
        <Art />
      </Svg>
    </View>
  );
}

const art: Record<string, () => React.JSX.Element> = {
  food: Food,
  housing: Housing,
  visa: Visa,
  "car-rental": Car,
  translation: Translation,
  travel: Travel,
  payment: Payment,
  community: Community,
  market: Market,
  emergency: Emergency,
};

// Partner services that ship their own brand logo instead of a drawn illustration.
const logos: Record<string, number> = {
  entertainment: require("../../assets/services/cocodrama.png"),
};

/** The bare illustration, no frame. */
export function ServiceArt({ code, size = 48 }: { code?: string | null; size?: number }) {
  const logo = code ? logos[code] : undefined;
  // Logo sits a touch smaller so it reads at the same visual weight as the illustrations.
  if (logo) return <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}><Image source={logo} style={{ width: size * 0.84, height: size * 0.84, borderRadius: size * 0.2 }} contentFit="cover" /></View>;
  const Art = (code && art[code]) || Fallback;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Art />
    </Svg>
  );
}

/** Illustration on a soft tinted card (badges, list rows, headers). Small sizes render bare. */
export function ServiceTile({ code, size = 48, shadow = true }: { code?: string | null; size?: number; shadow?: boolean }) {
  if (size < 30) return <ServiceArt code={code} size={size} />;
  const palette = (code && servicePalettes[code]) || { tint: "#ECFDF5", accent: "#0FAF7A" };
  // Borderless: the illustration floats on a blurred halo of its accent colour, no tile edge.
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <SoftGlow color={palette.accent} size={size * 1.3} opacity={shadow ? 0.26 : 0.2} />
      <ServiceArt code={code} size={size * 0.9} />
    </View>
  );
}
