import { View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";

/**
 * Hand-drawn service illustrations (soft 3D "clay" style: gradient volumes,
 * specular highlights and a contact shadow) on a 64×64 grid. Drawn in SVG so
 * they stay crisp at every size and ship with no image assets.
 */
export const servicePalettes: Record<string, { tint: string; accent: string }> = {
  food: { tint: "#FFF3EA", accent: "#EC5B2C" },
  housing: { tint: "#EDF5FE", accent: "#2F72D2" },
  visa: { tint: "#F2EFFE", accent: "#6650D4" },
  "car-rental": { tint: "#E9FAF7", accent: "#12948A" },
  translation: { tint: "#FAF0FC", accent: "#A44FC0" },
  travel: { tint: "#EAF7FE", accent: "#1C8CD1" },
  payment: { tint: "#FFF8E6", accent: "#E59410" },
  community: { tint: "#FFF1EE", accent: "#E2564A" },
  market: { tint: "#F2F8EA", accent: "#5C9A29" },
  emergency: { tint: "#FFEFEF", accent: "#D83A3A" },
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
        {lin("bowl", "#FFA261", "#E4511F")}
        {lin("wood", "#E2A465", "#B5743A", false)}
        <RadialGradient id="broth" cx="0.5" cy="0.4" r="0.6">
          <Stop offset="0" stopColor="#FFEBC2" />
          <Stop offset="1" stopColor="#F4B964" />
        </RadialGradient>
      </Defs>
      <Shadow rx={18} />
      <Path d="M24.5 14.5c-2 2.6 1.8 3.8 0 6.6M32 10.5c-2 2.6 1.8 3.8 0 6.6M39.5 14.5c-2 2.6 1.8 3.8 0 6.6" stroke="#C9D3DF" strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.85} />
      <Ellipse cx={32} cy={30} rx={22} ry={6} fill="#D9481F" />
      <Ellipse cx={32} cy={30.6} rx={19.6} ry={4.6} fill="url(#broth)" />
      <Path d="M17.5 31.2c2.6-1.8 4.8 1 7.4-.8s4.8 1 7.4-.8 4.8 1 7.4-.8 4.6 1 6.4-.2" stroke="#FFF4DA" strokeWidth={1.6} strokeLinecap="round" fill="none" />
      <Ellipse cx={39} cy={29.4} rx={3.8} ry={2.3} fill="#FFFFFF" />
      <Circle cx={39.6} cy={29.2} r={1.4} fill="#FFB020" />
      <Circle cx={24.5} cy={29.4} r={1.1} fill="#43B96E" />
      <Circle cx={28} cy={31.3} r={1} fill="#43B96E" />
      <Circle cx={45} cy={31} r={1} fill="#43B96E" />
      <Path d="M41.5 6.5 28.8 30M47.5 8.5 33.5 30.8" stroke="url(#wood)" strokeWidth={3} strokeLinecap="round" />
      <Path d="M10 30h44c0 11.4-9.8 20.2-22 20.2S10 41.4 10 30Z" fill="url(#bowl)" />
      <Path d="M14.6 33.6c1.5 5.6 5.6 9.9 11.4 11.8" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <Ellipse cx={32} cy={30} rx={22} ry={6} fill="none" stroke="#FFC29A" strokeWidth={1.5} />
      <Path d="M24.5 49.4h15l-1.4 4.1H25.9Z" fill="#C7401A" />
    </>
  );
}

function Housing() {
  return (
    <>
      <Defs>
        <GroundDef />
        {lin("wall", "#FFFFFF", "#E2EBF7")}
        {lin("roof", "#78C0FA", "#2C68C9", false)}
        {lin("door", "#4A90E6", "#2556B0")}
      </Defs>
      <Shadow rx={21} />
      <Path d="M42.5 4.8h5.2v12.6h-5.2Z" fill="#E8735A" />
      <Path d="M42 4h6.2v2.4H42Z" fill="#C8553F" />
      <Path d="M38 28.5 52.5 22v24.8L38 53Z" fill="#B7CCEA" />
      <Path d="M12 28.5 25 15l13 13.5V53H12Z" fill="url(#wall)" />
      <Path d="M25 14 39 7.6 54 22.4 38 29Z" fill="url(#roof)" />
      <Path d="M9.6 30 25 13.4 40.4 30" stroke="#2A5FBC" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M25.8 13.2 39 7.2" stroke="#9AD1FF" strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx={25} cy={23.6} r={2.7} fill="#CDEBFF" stroke="#8DB2E2" strokeWidth={1} />
      <Path d="M42.5 34 48.5 31.4v6.7l-6 2.6Z" fill="#E9F6FF" stroke="#8DB2E2" strokeWidth={1} />
      <Path d="M19.8 53V42.4a5.2 5.2 0 0 1 10.4 0V53Z" fill="url(#door)" />
      <Circle cx={27.6} cy={47.6} r={0.95} fill="#FFD27A" />
      <Path d="M14 31v19.5" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={0.9} />
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

/** The bare illustration, no frame. */
export function ServiceArt({ code, size = 48 }: { code?: string | null; size?: number }) {
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
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size * 0.3, backgroundColor: palette.tint, alignItems: "center", justifyContent: "center" },
        shadow ? { shadowColor: palette.accent, shadowOpacity: 0.14, shadowRadius: size * 0.14, shadowOffset: { width: 0, height: size * 0.08 } } : null,
      ]}
    >
      <ServiceArt code={code} size={size * 0.84} />
    </View>
  );
}
