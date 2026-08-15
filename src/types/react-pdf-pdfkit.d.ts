declare module '@react-pdf/pdfkit' {
  type PdfDocOptions = { margin?: number; size?: string | [number, number] };

  /**
   * Minimal surface used by consumer invoices; full typings ship with upstream inconsistently across tooling.
   */
  export default class PDFDocument {
    constructor(options?: PdfDocOptions);
    on(event: 'data', listener: (chunk: Buffer) => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'end', listener: () => void): this;
    fontSize(size: number): this;
    fillColor(color: string): this;
    moveDown(lines?: number): this;
    text(text: string, options?: Record<string, unknown>): this;
    end(): void;
  }
}
