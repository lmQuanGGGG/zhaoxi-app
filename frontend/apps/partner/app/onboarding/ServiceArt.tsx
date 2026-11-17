/* Clay-style 3D service illustrations, ported 1:1 from the ZhaoXi app
 * (frontend/apps/customer-mobile/src/ui/service-icons.tsx) to DOM SVG so the web
 * Partner sign-up shows the same artwork as the app. Gradient ids are scoped per icon. */
import type { JSX } from "react";

const lin = (id: string, from: string, to: string, vertical = true) => (
  <linearGradient id={id} x1="0" y1="0" x2={vertical ? "0" : "1"} y2="1">
    <stop offset="0" stopColor={from} />
    <stop offset="1" stopColor={to} />
  </linearGradient>
);
const Shadow = ({ rx = 19, cy = 56.5 }: { rx?: number; cy?: number }) => <ellipse cx={32} cy={cy} rx={rx} ry={3.4} fill="url(#ground)" />;
const GroundDef = () => (
  <radialGradient id="ground" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stopColor="#0F172A" stopOpacity={0.22} />
    <stop offset="1" stopColor="#0F172A" stopOpacity={0} />
  </radialGradient>
);

function FoodArt() {
  return (
    <>
      <defs>
        <GroundDef />
        {lin("food-bowl2", "#7CC7F2", "#2F86C9")}
        {lin("food-tea", "#F6DDBF", "#D9A06A")}
        {lin("food-lid", "#FFFFFF", "#E6EEF5")}
        {lin("food-bunTop", "#FFC56B", "#E08A2E")}
        {lin("food-bunBot", "#F6B25A", "#D47A26")}
        {lin("food-patty", "#8A4B2A", "#5C2E17")}
        {lin("food-stick", "#E9B47A", "#B97A3E", false)}
      </defs>
      <Shadow rx={26} cy={57} />
      {/* noodle bowl at the back, tucked behind the burger */}
      <g transform="translate(3 9)">
      <path d="M15 10.5c-1.6-2 1.4-3.2 0-5.4M20 9.5c-1.6-2 1.4-3.2 0-5.4" stroke="#CBD5E1" strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <path d="M5 17h22c0 6-4.9 10.4-11 10.4S5 23 5 17Z" fill="url(#food-bowl2)" />
      <ellipse cx={16} cy={17} rx={11} ry={3.2} fill="#FFF3E2" />
      <ellipse cx={16} cy={17.3} rx={9.2} ry={2.3} fill="#F4B860" />
      <path d="M9.5 17.6c1.4-.8 2.6.6 4-.2s2.6.6 4-.2 2.6.6 4-.2" stroke="#FFF7E0" strokeWidth={1.2} strokeLinecap="round" fill="none" />
      <path d="M22 4.5 15.6 16.8M25.6 6 18.8 17.4" stroke="url(#food-stick)" strokeWidth={1.8} strokeLinecap="round" />
      </g>
      {/* bubble tea on the right */}
      <path d="M51 9.5 46.6 20.6" stroke="#FF6FA0" strokeWidth={2.6} strokeLinecap="round" />
      <path d="M36.6 21.4h20l-2.6 29.4a3.2 3.2 0 0 1-3.2 2.9h-8.4a3.2 3.2 0 0 1-3.2-2.9Z" fill="url(#food-tea)" />
      <path d="M36.9 24.6h19.4" stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={1.6} />
      <circle cx={42} cy={48.6} r={1.9} fill="#3B2416" /><circle cx={46.6} cy={49.6} r={1.9} fill="#3B2416" /><circle cx={51} cy={48.4} r={1.9} fill="#3B2416" />
      <circle cx={44.2} cy={45.4} r={1.9} fill="#3B2416" /><circle cx={48.8} cy={45.2} r={1.9} fill="#3B2416" />
      <path d="M39.6 27.5c.4 6 .9 12 1.6 18" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" />
      <path d="M35.4 21.6c0-3.6 4.9-5.6 11.2-5.6s11.2 2 11.2 5.6Z" fill="url(#food-lid)" />
      <rect x={35} y={20.4} width={23.2} height={2.6} rx={1.3} fill="#F1F5F9" />
      {/* burger in front */}
      <path d="M5.6 50.4h29.8c0 2.6-2 4.4-4.6 4.4H10.2c-2.6 0-4.6-1.8-4.6-4.4Z" fill="url(#food-bunBot)" />
      <rect x={5} y={44.6} width={31} height={6.2} rx={3.1} fill="url(#food-patty)" />
      <path d="M4.6 44.6h31.8l-3.8 3.6-3.2-2.4-4.4 3.4-3.8-3-4.6 3.4-3.8-3.2-4 2.8Z" fill="#FFCD3C" />
      <path d="M4.8 42.2c2.4 2.6 4.6 2.6 6.6.6s4.4-2 6.6 0 4.4 2 6.6 0 4.4-2 6.6 0 2.6 1.8 4.6-.6v2.8H4.8Z" fill="#6FCF6A" />
      <path d="M5 42.4C5 34.6 11.8 29.6 20.6 29.6S36.2 34.6 36.2 42.4Z" fill="url(#food-bunTop)" />
      <path d="M11 35.4c1.8-2.4 4.6-3.8 7.8-4.2" stroke="#FFFFFF" strokeOpacity={0.65} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <ellipse cx={15} cy={36.8} rx={1.1} ry={0.6} fill="#FFF3D6" /><ellipse cx={21} cy={34.6} rx={1.1} ry={0.6} fill="#FFF3D6" />
      <ellipse cx={26.4} cy={36.4} rx={1.1} ry={0.6} fill="#FFF3D6" /><ellipse cx={20.6} cy={38.6} rx={1.1} ry={0.6} fill="#FFF3D6" />
    </>
  );
}

function HousingArt() {
  return (
    <>
      <defs>
        <GroundDef />
        {lin("housing-body", "#FFFDF8", "#F3E4D0")}
        {lin("housing-bodySide", "#EBD5B9", "#D2B48F")}
        {lin("housing-roofFront", "#FF9A7A", "#E5573C")}
        {lin("housing-roofSide", "#F07457", "#C9432C")}
        {lin("housing-doorTeal", "#2FA3A1", "#0E5A63")}
        {lin("housing-warm", "#FFF4C8", "#FFC452")}
        <radialGradient id="housing-shrub" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#8BE29A" />
          <stop offset="1" stopColor="#2E9E4F" />
        </radialGradient>
      </defs>
      <Shadow rx={25} cy={56.5} />
      {/* side wall */}
      <path d="M42 30.5 53.5 27.2V49.6L42 53.6Z" fill="url(#housing-bodySide)" stroke="url(#housing-bodySide)" strokeWidth={2} strokeLinejoin="round" />
      <path d="M45.2 35.4 50.4 34v5.6l-5.2 1.5Z" fill="url(#housing-warm)" />
      {/* front body */}
      <rect x={11} y={29.5} width={31} height={24.5} rx={4} fill="url(#housing-body)" />
      {/* roof: side slope + rounded front gable */}
      <path d="M27.2 12.6 45.6 7.6 58.4 25.2 44.4 30.4Z" fill="url(#housing-roofSide)" stroke="url(#housing-roofSide)" strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M28.6 13.4 45 8.8" stroke="#FFB59F" strokeWidth={2} strokeLinecap="round" />
      <path d="M8.4 32.6c-.9 0-1.4-1-.8-1.7L24.4 13.4c1.6-1.7 4.2-1.7 5.8 0L47 30.9c.6.7.1 1.7-.8 1.7Z" fill="url(#housing-roofFront)" />
      <path d="M12.6 28.8 25.2 15.4" stroke="#FFC2AE" strokeWidth={2.2} strokeLinecap="round" />
      {/* round gable window */}
      <circle cx={27.3} cy={24.6} r={3.6} fill="url(#housing-warm)" stroke="#FFFFFF" strokeWidth={1.6} />
      {/* door + window */}
      <path d="M15.6 54V43.4a4.4 4.4 0 0 1 8.8 0V54Z" fill="url(#housing-doorTeal)" />
      <circle cx={22.4} cy={48.6} r={0.95} fill="#FFD27A" />
      <rect x={28.6} y={37.6} width={9.6} height={9} rx={2.4} fill="url(#housing-warm)" stroke="#FFFFFF" strokeWidth={1.6} />
      <path d="M33.4 38.4v7.4M29.4 42.1h8" stroke="#E6A43B" strokeWidth={1} />
      <path d="M14 33v6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
      {/* shrubs */}
      <circle cx={9} cy={51.4} r={4.2} fill="url(#housing-shrub)" />
      <circle cx={13.4} cy={53.2} r={2.8} fill="url(#housing-shrub)" />
      <circle cx={55.6} cy={51.6} r={3.6} fill="url(#housing-shrub)" />
      <circle cx={7.8} cy={49.8} r={1.1} fill="#FFFFFF" opacity={0.55} />
    </>
  );
}

function VisaArt() {
  return (
    <>
      <defs>
        <GroundDef />
        {lin("visa-cover", "#A595F8", "#5640C4", false)}
        {lin("visa-gold", "#FFE19A", "#F0A42E")}
      </defs>
      <Shadow rx={18} />
      <g transform="rotate(-14 22 34)">
        <rect x={9} y={19} width={25} height={34} rx={4} fill="#FFF1C9" />
        <rect x={9} y={19} width={25} height={8.5} rx={4} fill="#F6B83E" />
        <rect x={13} y={32} width={14} height={2.2} rx={1.1} fill="#E7C27A" />
        <rect x={13} y={37} width={10} height={2.2} rx={1.1} fill="#E7C27A" />
      </g>
      <path d="M50.5 12.6h1.6a2.6 2.6 0 0 1 2.6 2.6v32.2a2.6 2.6 0 0 1-2.6 2.6h-1.6Z" fill="#F3F0FF" />
      <rect x={22} y={9.5} width={30} height={42.5} rx={5} fill="url(#visa-cover)" />
      <rect x={22} y={9.5} width={5.2} height={42.5} rx={2.6} fill="#3F2DA4" opacity={0.45} />
      <rect x={22} y={9.5} width={30} height={14} rx={5} fill="#FFFFFF" opacity={0.1} />
      <circle cx={38.8} cy={26.6} r={7} fill="none" stroke="url(#visa-gold)" strokeWidth={2} />
      <ellipse cx={38.8} cy={26.6} rx={3.1} ry={7} fill="none" stroke="url(#visa-gold)" strokeWidth={1.5} />
      <path d="M31.8 26.6h14M33.3 22.6h11M33.3 30.6h11" stroke="url(#visa-gold)" strokeWidth={1.3} />
      <rect x={31.2} y={38.6} width={15.2} height={2.5} rx={1.25} fill="url(#visa-gold)" />
      <rect x={33.8} y={43.2} width={10} height={2} rx={1} fill="url(#visa-gold)" opacity={0.75} />
    </>
  );
}

function CarArt() {
  return (
    <>
      <defs>
        <GroundDef />
        {lin("carrental-body", "#62E3CF", "#0F8E83")}
        {lin("carrental-glass", "#F0FCFF", "#9EDDF0")}
        <radialGradient id="carrental-hub" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#94A3B8" />
        </radialGradient>
      </defs>
      <Shadow rx={24} cy={54.5} />
      <path d="M8 40.5c0-4 2.6-7.1 6.6-7.9l4.4-.9 5.2-8.2c1-1.6 2.8-2.6 4.7-2.6h10.7c2 0 3.8 1 4.9 2.6l5.4 8.1 3 .6c3.6.8 6.3 4 6.3 7.7V45c0 1.7-1.3 3-3 3H11c-1.7 0-3-1.3-3-3Z" fill="url(#carrental-body)" />
      <path d="M25.8 24.4c.6-.9 1.6-1.4 2.7-1.4h4.9v9.2H22.1Z" fill="url(#carrental-glass)" />
      <path d="M35.4 23h3.9c1.1 0 2.1.5 2.7 1.4l4.4 7.8H35.4Z" fill="url(#carrental-glass)" />
      <path d="M28.3 25.2 25.6 30" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M34.4 33v10.5" stroke="#0B746B" strokeWidth={1} opacity={0.45} />
      <path d="M13 36c8.5-1.7 30-1.7 38.5 0" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <ellipse cx={54} cy={38} rx={2} ry={1.6} fill="#FFE38A" />
      <rect x={8.6} y={36.4} width={2.4} height={3.6} rx={1.2} fill="#FF7A6B" />
      <circle cx={19.5} cy={47.5} r={6.2} fill="#1E293B" />
      <circle cx={19.5} cy={47.5} r={2.9} fill="url(#carrental-hub)" />
      <circle cx={45} cy={47.5} r={6.2} fill="#1E293B" />
      <circle cx={45} cy={47.5} r={2.9} fill="url(#carrental-hub)" />
    </>
  );
}

function TranslationArt() {
  return (
    <>
      <defs>
        <GroundDef />
        {lin("translation-back", "#EFAEF6", "#A64CC3", false)}
        {lin("translation-front", "#FFFFFF", "#EEF0FF")}
      </defs>
      <Shadow rx={18} />
      <path d="M8 15a7 7 0 0 1 7-7h20a7 7 0 0 1 7 7v12a7 7 0 0 1-7 7H21.5l-7.3 6.2V33.6A7 7 0 0 1 8 27Z" fill="url(#translation-back)" />
      <path d="M12 14.4a3.6 3.6 0 0 1 3.6-3.6h6" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round" fill="none" />
      <path d="M16.8 16.2h16.4M25 13v3.2M19.6 16.2c1.2 5 4.5 8.4 10.6 9.9M30.6 16.2c-1.4 5-5 8.4-11.2 9.9" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <path d="M24 33a7 7 0 0 1 7-7h19a7 7 0 0 1 7 7v11a7 7 0 0 1-7 7h-1.6v6.4L40.9 51H31a7 7 0 0 1-7-7Z" fill="url(#translation-front)" stroke="#E2E8F0" strokeWidth={1} />
      <path d="M34.4 46.2 40.5 31.6l6.1 14.6M36.7 40.8h7.6" stroke="#8E3FB2" strokeWidth={2.7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  );
}

function TravelArt() {
  return (
    <>
      <defs>
        <GroundDef />
        {lin("travel-case", "#74DAFB", "#1A80CB", false)}
      </defs>
      <Shadow rx={18} />
      <path d="M25 16v-4a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4" stroke="#1E3A5F" strokeWidth={3.2} strokeLinecap="round" fill="none" />
      <rect x={14} y={15} width={36} height={35} rx={7} fill="url(#travel-case)" />
      <rect x={23} y={15} width={3} height={35} fill="#FFFFFF" opacity={0.22} />
      <rect x={38} y={15} width={3} height={35} fill="#FFFFFF" opacity={0.22} />
      <rect x={14} y={15} width={36} height={12} rx={7} fill="#FFFFFF" opacity={0.16} />
      <circle cx={31.5} cy={35.5} r={6.2} fill="#FFFFFF" />
      <g transform="translate(26.9 30.9) scale(0.385)">
        <path d="M21 15.2v-1.7l-7.6-4.8V4.4a1.4 1.4 0 0 0-2.8 0v4.3L3 13.5v1.7l7.6-2.3v4.8l-2.1 1.5V21l3.5-1 3.5 1v-1.8l-2.1-1.5v-4.8Z" fill="#1A80CB" />
      </g>
      <circle cx={44} cy={23.6} r={3.8} fill="#FFD25E" />
      <path d="M44 21.6v4M42 23.6h4" stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" />
      <circle cx={21} cy={52.6} r={2.6} fill="#1E293B" />
      <circle cx={43} cy={52.6} r={2.6} fill="#1E293B" />
    </>
  );
}

function MarketArt() {
  const stripe = 46 / 6;
  return (
    <>
      <defs>
        <GroundDef />
        {lin("market-shop", "#FFFBF2", "#F1DEBE")}
        {lin("market-win", "#E3F5FF", "#98CBEE")}
        {lin("market-mdoor", "#82C770", "#4A8A36")}
      </defs>
      <Shadow rx={22} />
      <rect x={12} y={24} width={40} height={29} rx={3} fill="url(#market-shop)" />
      <rect x={16} y={33.5} width={14} height={11} rx={2} fill="url(#market-win)" />
      <path d="M16.5 40h13" stroke="#FFFFFF" strokeWidth={1.2} opacity={0.8} />
      <rect x={34.5} y={33.5} width={13} height={19.5} rx={2} fill="url(#market-mdoor)" />
      <circle cx={44.6} cy={43.5} r={0.95} fill="#FFE08A" />
      {Array.from({ length: 6 }, (_, i) => {
        const color = i % 2 ? "#FFFFFF" : "#FF5A5A";
        return (
          <g key={i}>
            <rect x={9 + i * stripe} y={16} width={stripe + 0.2} height={10} fill={color} />
            <circle cx={9 + i * stripe + stripe / 2} cy={26} r={stripe / 2} fill={color} />
          </g>
        );
      })}
      <rect x={8} y={12.8} width={48} height={4.6} rx={2.3} fill="#E23B3B" />
      <rect x={22} y={5.5} width={20} height={7.5} rx={3.75} fill="#FFD25E" />
      <path d="M27 9.2h10" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" />
    </>
  );
}

function StoreArt() {
  return (
    <>
      <defs><GroundDef />{lin("store-wall2", "#FFFFFF", "#E3EAF2")}{lin("store-awn", "#FF8A6B", "#E2482F")}</defs>
      <Shadow rx={22} />
      <rect x={12} y={26} width={40} height={27} rx={3} fill="url(#store-wall2)" />
      <rect x={18} y={34} width={12} height={19} rx={2} fill="#2F72D2" />
      <rect x={34} y={34} width={12} height={10} rx={2} fill="#9BD3F7" />
      <path d="M9 18l4-8h38l4 8v4a5.5 5.5 0 0 1-11 0 5.5 5.5 0 0 1-11 0 5.5 5.5 0 0 1-11 0 5.5 5.5 0 0 1-11 0Z" fill="url(#store-awn)" />
      <path d="M20 10l-2 12M32 10v12M44 10l2 12" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2.4} />
    </>
  );
}

function PinArt() {
  return (
    <>
      <defs><GroundDef />{lin("pin-pin", "#FF7A6B", "#D7262B")}</defs>
      <Shadow rx={12} cy={57} />
      <path d="M32 56s-17-15.6-17-29.5C15 16.8 22.6 9 32 9s17 7.8 17 17.5C49 40.4 32 56 32 56Z" fill="url(#pin-pin)" />
      <circle cx={32} cy={26.5} r={7} fill="#FFFFFF" />
      <path d="M22 18.5c2-3.4 5.4-5.6 9.4-6" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={2.6} strokeLinecap="round" fill="none" />
    </>
  );
}

function ShieldArt() {
  return (
    <>
      <defs>
        <GroundDef />
        {lin("shield-shield", "#8C9BFF", "#4B4FD1")}
      </defs>
      <Shadow rx={17} />
      <path d="M32 7.5 51 14v14.5C51 40 43 48.6 32 53 21 48.6 13 40 13 28.5V14Z" fill="url(#shield-shield)" />
      <path d="M32 11.8 47 17v11.5c0 9-6.1 16-15 19.8Z" fill="#FFFFFF" opacity={0.12} />
      <path d="m23.5 30.5 6 6 11.5-12.5" stroke="#FFFFFF" strokeWidth={4.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M17.5 17.5c2.4-.9 4.8-1.7 7.2-2.5" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={2.4} strokeLinecap="round" />
    </>
  );
}

function PeopleArt() {
  return (
    <>
      <defs><GroundDef />{lin("people-p1", "#7CC4FF", "#2F72D2")}{lin("people-p2", "#8EE3C8", "#16A085")}{lin("people-skin", "#FFE1C4", "#F2B488")}</defs>
      <Shadow rx={22} />
      <circle cx={22} cy={22} r={7.5} fill="url(#people-skin)" />
      <path d="M8 52c0-9.4 6.3-16 14-16s14 6.6 14 16Z" fill="url(#people-p2)" />
      <circle cx={41} cy={20} r={8.5} fill="url(#people-skin)" />
      <path d="M25 53c0-10.6 7.2-18 16-18s16 7.4 16 18Z" fill="url(#people-p1)" />
      <path d="M31 42c1.6-2.4 3.8-4 6.4-4.6" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2.4} strokeLinecap="round" fill="none" />
    </>
  );
}

export const serviceArtPalettes: Record<string, { tint: string; accent: string }> = {
  food: { tint: "#FFF4E6", accent: "#F08A3C" },
  housing: { tint: "#FFF0EA", accent: "#E5573C" },
  visa: { tint: "#F2EFFE", accent: "#6650D4" },
  "car-rental": { tint: "#E9FAF7", accent: "#12948A" },
  translation: { tint: "#FAF0FC", accent: "#A44FC0" },
  travel: { tint: "#EAF7FE", accent: "#1C8CD1" },
  market: { tint: "#F2F8EA", accent: "#5C9A29" },
  store: { tint: "#FFF1EC", accent: "#E2482F" },
};

const art: Record<string, () => JSX.Element> = {
  "food": FoodArt,
  "housing": HousingArt,
  "visa": VisaArt,
  "car-rental": CarArt,
  "translation": TranslationArt,
  "travel": TravelArt,
  "market": MarketArt,
  "store": StoreArt,
  "pin": PinArt,
  "shield": ShieldArt,
  "people": PeopleArt
};

/** Bare illustration on a 64×64 grid; unknown codes fall back to the store artwork. */
export function ServiceArt({ code, size = 48 }: { code: string; size?: number }) {
  const Art = art[code] || StoreArt;
  return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false"><Art /></svg>;
}
