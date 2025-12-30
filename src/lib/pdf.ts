// Minimal PDF generator for a single-page text document
// Produces a US Letter page with Helvetica text lines.

function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export type SimplePdfOptions = {
  title?: string;
  fontSize?: number; // default 12
  margin?: number; // default 54 (3/4")
  pageWidth?: number; // default 612 (8.5")
  pageHeight?: number; // default 792 (11")
  lineHeight?: number; // default 16
};

export function buildSimplePdf(lines: string[], opts: SimplePdfOptions = {}): Uint8Array {
  const fontSize = opts.fontSize ?? 12;
  const margin = opts.margin ?? 54;
  const width = opts.pageWidth ?? 612;
  const height = opts.pageHeight ?? 792;
  const lineHeight = opts.lineHeight ?? 16;

  const startX = margin;
  const startY = height - margin;

  const header = `%PDF-1.4\n`;

  // Objects will be assembled and offsets recorded
  const objects: string[] = [];

  // 1: Catalog
  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  // 2: Pages
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);

  // 5: Font (Helvetica)
  objects.push(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

  // 4: Contents (constructed later; we need length)
  const contentLines: string[] = [];
  contentLines.push('BT');
  contentLines.push(`/F1 ${fontSize} Tf`);
  contentLines.push(`${startX} ${startY} Td`);
  contentLines.push(`${lineHeight} TL`);
  if (opts.title) {
    contentLines.push(`(${escapePdfText(opts.title)}) Tj`);
    contentLines.push('T*');
    contentLines.push('T*'); // extra spacing after title
  }
  for (const line of lines) {
    contentLines.push(`(${escapePdfText(line)}) Tj`);
    contentLines.push('T*');
  }
  contentLines.push('ET');
  const contentStream = contentLines.join('\n');
  const contentObj = `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`;
  objects.push(contentObj);

  // 3: Page (references contents and font resource)
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`
  );

  // Assemble with offsets
  const offsets: number[] = [];
  let body = '';
  for (const obj of objects) {
    offsets.push((header.length + body.length));
    body += obj;
  }

  // Build xref
  const xrefStart = header.length + body.length;
  let xref = 'xref\n0 ' + (objects.length + 1) + '\n';
  xref += '0000000000 65535 f \n';
  for (const off of offsets) {
    const offStr = off.toString().padStart(10, '0');
    xref += `${offStr} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const pdfString = header + body + xref + trailer;
  return new TextEncoder().encode(pdfString);
}

