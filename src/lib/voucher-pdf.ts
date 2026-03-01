import QRCode from 'qrcode';

/**
 * Generiert einen QR-Code als Data-URL (base64 PNG)
 * für die Einlöse-URL eines Gutscheins
 */
export async function generateVoucherQRDataUrl(redeemUrl: string): Promise<string> {
  return await QRCode.toDataURL(redeemUrl, {
    width: 300,
    margin: 2,
    color: {
      dark: '#423430',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}

