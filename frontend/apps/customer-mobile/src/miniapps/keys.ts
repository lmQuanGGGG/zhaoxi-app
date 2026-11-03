/**
 * Khoá công khai Ed25519 host tin khi nạp mini app (tương đương `RepackPublicKey`
 * trong Info.plist của VSP, nhưng hỗ trợ nhiều khoá để xoay vòng).
 *
 * - `env: "prod"`: khoá phát hành, khoá riêng chỉ nằm ở CI / kho bí mật.
 * - `env: "dev"`: chỉ được nhận trong bản `__DEV__` (simulator, dev build).
 *
 * Thêm khoá: chạy `npx zhaoxi-miniapp keygen` trong thư mục mini app rồi dán dòng nó in ra.
 * Thu hồi khoá: xoá dòng tương ứng và phát hành bản host mới.
 */
export type TrustedKey = { keyId: string; publicKey: string; env: "dev" | "prod"; note: string };

export const trustedKeys: TrustedKey[] = [
  // Khoá dev của mini app mẫu (miniapp_zhaoxi_example/miniapp-signing.pem, không commit). Mất file thì tạo khoá mới và thay dòng này.
  { keyId: "588b24b78faa74ad", publicKey: "yQ4YgirQuyo4gxJwmjJqI3ZgYLuPl48U+JmfP9ju/rw=", env: "dev", note: "zhaoxi-dev-2026-11" },
  // Khoá dev của mini app Partner (miniapp_zhaoxi_partner/miniapp-signing.pem, không commit).
  { keyId: "098cfe54f8425da6", publicKey: "FHY4gY7s53u2rB4rvCtRWMaOdwDvpXMH4LOh/falg8s=", env: "dev", note: "zhaoxi-partner-dev-2026-11" },
];
