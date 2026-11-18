// react-native-svg → DOM SVG, only for scripts/gen-art3d.mjs (renders the app's clay icons to static markup).
import { createElement } from "react";
const strip = ({ pointerEvents, style, ...rest }) => rest;
const mk = (tag) => (props) => createElement(tag, strip(props));
export default function Svg(props) { return createElement("svg", { xmlns: "http://www.w3.org/2000/svg", ...strip(props) }); }
export const Circle = mk("circle"), Defs = mk("defs"), Ellipse = mk("ellipse"), G = mk("g"), LinearGradient = mk("linearGradient"), Path = mk("path"), RadialGradient = mk("radialGradient"), Rect = mk("rect"), Stop = mk("stop");
