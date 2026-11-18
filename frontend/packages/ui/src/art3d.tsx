import type { CSSProperties } from "react";
import { ART3D, SERVICE_ART, type Art3DKind, type ServiceArtCode } from "./art3d-data";

export type { Art3DKind, ServiceArtCode };

const base: CSSProperties = { display: "inline-block", flex: "0 0 auto", width: "1.3em", height: "1.3em", lineHeight: 0, verticalAlign: "-0.28em" };

/**
 * The ZhaoXi app's clay 3D icons on the web (generated from the app's own SVG drawings by
 * apps/partner/scripts/gen-art3d.mjs). Sized in em by default so an icon matches the text it sits in;
 * pass `size` (px) for a fixed size. Decorative unless `title` is given.
 */
function Svg3D({ svg, size, title, style, className }: { svg: string; size?: number; title?: string; style?: CSSProperties; className?: string }) {
  const box = size ? { width: size, height: size, verticalAlign: "middle" } : null;
  return (
    <span
      className={className ? `zx-art3d ${className}` : "zx-art3d"}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ ...base, ...box, ...style }}
      dangerouslySetInnerHTML={{ __html: svg.replace("<svg ", '<svg width="100%" height="100%" ') }}
    />
  );
}

/** A clay pictogram (bell, pin, card, wallet, store…), the same set the app uses instead of emoji. */
export function Art3D({ kind, ...rest }: { kind: Art3DKind; size?: number; title?: string; style?: CSSProperties; className?: string }) {
  return <Svg3D svg={ART3D[kind]} {...rest} />;
}

/** A service illustration (food, housing, car-rental, visa, translation, travel, market…). */
export function ServiceArt3D({ code, ...rest }: { code: ServiceArtCode; size?: number; title?: string; style?: CSSProperties; className?: string }) {
  return <Svg3D svg={SERVICE_ART[code]} {...rest} />;
}
