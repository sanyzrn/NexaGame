/** Type declarations for the untyped `subset-font` dev dependency (build-time only). */
declare module 'subset-font' {
  interface SubsetFontOptions {
    targetFormat?: 'sfnt' | 'woff' | 'woff2' | 'truetype';
    /** Extra name-table IDs to preserve (most are dropped by default). */
    preserveNameIds?: number[];
    /** OpenType feature tags to retain; all layout features are kept by default. */
    keepFeatures?: string[];
    /** Don't perform glyph closure for GSUB substitutions. */
    noLayoutClosure?: boolean;
    glyphNames?: boolean;
    /** Drop hinting instructions (useless for canvas text at game sizes). */
    noHinting?: boolean;
    dropTables?: string[];
    variationAxes?:
      | Record<string, number>
      | Record<string, { min: number; max: number; default?: number }>;
  }
  function subsetFont(
    buffer: Buffer,
    text: string | null | undefined,
    options?: SubsetFontOptions,
  ): Promise<Buffer>;
  export default subsetFont;
}
