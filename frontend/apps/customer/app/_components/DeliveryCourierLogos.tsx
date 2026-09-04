"use client";

import React, { useState } from "react";

export type DeliveryProviderId = "green_sm" | "grab";

export function GrabLogo({ size = 28, className = "" }: { size?: number; className?: string }) {
  const [error, setError] = useState(false);
  if (error) {
    const width = Math.round((size * 82) / 28);
    return (
      <svg
        width={width}
        height={size}
        viewBox="0 0 82 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Grab Logo"
      >
        <rect width="82" height="28" rx="6" fill="#00B14F" />
        <g fill="#FFFFFF">
          <path d="M18.8 14.1c0-3.6-2.6-6.1-6.4-6.1-4 0-6.6 2.9-6.6 6.8 0 3.9 2.6 6.8 6.8 6.8 3.2 0 5.4-1.6 6.1-3.9h-3.3c-.5 1-1.5 1.6-2.8 1.6-2.2 0-3.6-1.5-3.6-3.8h9.7c.1-.5.1-.9.1-1.4zm-9.7-1.1c.1-2 1.4-3.4 3.3-3.4 1.8 0 3.1 1.4 3.2 3.4H9.1z" />
          <path d="M24.2 12.7v-4.4h-3.1v13.1h3.1v-6.5c0-2.4 1.4-3.7 3.5-3.7.4 0 .8.1 1.1.2V8.1c-.4-.1-.8-.1-1.2-.1-1.6 0-2.8.9-3.4 2.3v2.4z" />
          <path d="M37.7 13.9c0-3.5-2.5-5.9-6.1-5.9-3.7 0-6.1 2.4-6.1 5.7 0 2.2 1.3 3.8 3.4 4.3l2.8.6c1.4.3 2.1.8 2.1 1.7 0 1.2-1.2 2-2.8 2-1.7 0-2.9-.9-3.1-2.2H25c.3 2.6 2.4 4.4 5.9 4.4 3.7 0 6.1-2.2 6.1-5.4 0-2.1-1.3-3.6-3.4-4.1l-2.8-.6c-1.4-.3-2.1-.8-2.1-1.7 0-1.1 1.1-1.9 2.6-1.9 1.5 0 2.6.8 2.8 2h3.7v-.9z" />
          <path d="M48.2 8.3v3.1c-.8-.8-2-1.3-3.4-1.3-3.6 0-6.1 2.8-6.1 6.7 0 3.9 2.5 6.7 6.1 6.7 1.4 0 2.6-.5 3.4-1.4v1.3h3.1V8.3h-3.1zm-3.1 12.8c-2.2 0-3.7-1.7-3.7-4.3 0-2.5 1.5-4.3 3.7-4.3 2.1 0 3.6 1.7 3.6 4.3 0 2.5-1.5 4.3-3.6 4.3z" />
        </g>
      </svg>
    );
  }
  return (
    <img
      src="/couriers/grab.png"
      alt="Grab"
      height={size}
      onError={() => setError(true)}
      className={className}
      style={{
        height: `${size}px`,
        width: "auto",
        maxHeight: `${size}px`,
        objectFit: "contain",
        display: "inline-block",
        verticalAlign: "middle",
      }}
    />
  );
}

export function XanhSMLogo({ size = 28, className = "" }: { size?: number; className?: string }) {
  const [error, setError] = useState(false);
  if (error) {
    const width = Math.round((size * 96) / 28);
    return (
      <svg
        width={width}
        height={size}
        viewBox="0 0 96 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Xanh SM Logo"
      >
        <rect width="96" height="28" rx="6" fill="#00B092" />
        <path d="M14.2 6.5L9.5 15h4.2l-1.9 6.5 6.7-9.5h-4.3l2-5.5h-2z" fill="#FFD700" />
        <text
          x="26"
          y="19"
          fill="#FFFFFF"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="13"
          fontWeight="900"
          letterSpacing="0.6"
        >
          GREEN SM
        </text>
      </svg>
    );
  }
  return (
    <img
      src="/couriers/green-sm.png"
      alt="Green SM"
      height={size}
      onError={() => setError(true)}
      className={className}
      style={{
        height: `${size}px`,
        width: "auto",
        maxHeight: `${size}px`,
        objectFit: "contain",
        display: "inline-block",
        verticalAlign: "middle",
      }}
    />
  );
}

export function CourierBadge({
  provider,
  size = 22,
}: {
  provider: DeliveryProviderId | string;
  size?: number;
}) {
  if (provider === "grab") {
    return <GrabLogo size={size} />;
  }
  return <XanhSMLogo size={size} />;
}
