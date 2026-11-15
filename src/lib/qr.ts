import "server-only";
import QRCode from "qrcode";

/** QR code as an SVG string (ink on white). */
export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#3A3530", light: "#FFFFFF" },
  });
}
