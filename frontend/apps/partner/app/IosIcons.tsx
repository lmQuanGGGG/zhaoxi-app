import type { SVGProps } from "react";

/**
 * Standard iOS SF Symbols: person.fill (Apple Style)
 */
export function IosPersonIcon({
  size = 15,
  color = "#111827",
  style,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={color}
      style={{ display: "inline-block", verticalAlign: "-2px", flexShrink: 0, ...style }}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm5 6s1 0 1-1-1-4-6-4-6 3-6 4 1 1 1 1h10z" />
    </svg>
  );
}

/**
 * Standard iOS SF Symbols: phone.fill (Apple Style)
 */
export function IosPhoneIcon({
  size = 14,
  color = "#111827",
  style,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={color}
      style={{ display: "inline-block", verticalAlign: "-2px", flexShrink: 0, ...style }}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"
      />
    </svg>
  );
}
