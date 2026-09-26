declare module "qrcode" {
  const QRCode: {
    toDataURL: (text: string, options?: unknown) => Promise<string>;
    /** The code's module grid, for drawing it yourself (the Confirmation Letter draws it in vector). */
    create: (text: string, options?: { errorCorrectionLevel?: "L" | "M" | "Q" | "H" }) => {
      modules: { size: number; get: (row: number, column: number) => number | boolean };
    };
  };
  export default QRCode;
}
