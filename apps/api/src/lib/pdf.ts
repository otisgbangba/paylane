/**
 * Minimal single-page PDF writer. Enough for a NIN slip without pulling a
 * rendering library into the API bundle.
 */

interface PdfLine {
  label?: string;
  value: string;
  size?: number;
}

function sanitize(text: string): string {
  return text
    .replace(/₦/g, "NGN ")
    .replace(/[•·]/g, "*")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function buildPdfDocument(options: {
  title: string;
  subtitle?: string;
  lines: PdfLine[];
  footer?: string;
}): string {
  const commands: string[] = ["BT"];
  commands.push("/F2 18 Tf", "50 780 Td", `(${sanitize(options.title)}) Tj`);
  if (options.subtitle) {
    commands.push("/F1 10 Tf", "0 -20 Td", `(${sanitize(options.subtitle)}) Tj`);
  }
  commands.push("/F1 11 Tf", "0 -34 Td");

  for (const line of options.lines) {
    const size = line.size ?? 11;
    for (const [index, text] of wrap(line.value, 88).entries()) {
      const prefix = index === 0 && line.label ? `${line.label}: ` : "";
      commands.push(`/F1 ${size} Tf`, `(${sanitize(prefix + text)}) Tj`, "0 -16 Td");
    }
    commands.push("0 -4 Td");
  }

  if (options.footer) {
    commands.push("/F1 8 Tf", "0 -24 Td");
    for (const text of wrap(options.footer, 110)) {
      commands.push(`(${sanitize(text)}) Tj`, "0 -11 Td");
    }
  }
  commands.push("ET");
  const content = commands.join("\n");

  const objects: string[] = [
    "",
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = Buffer.byteLength(pdf, "latin1");
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1").toString("base64");
}
