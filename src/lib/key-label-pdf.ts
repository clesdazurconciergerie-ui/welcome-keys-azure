import { jsPDF } from "jspdf";
import type { KeySet } from "@/hooks/useKeySets";
import officialLogoUrl from "@/assets/azurekeys-properties-logo.png";

export interface KeyLabelOptions {
  widthMm: number;
  heightMm: number;
  brandName?: string;
  nfcUrl: string;
}

function drawSpacedCenteredText(doc: jsPDF, text: string, center: number, y: number, spacing: number) {
  // jsPDF does not include charSpace in text width when using align:center.
  // Position the text manually so the visible result is truly centered.
  const textWidth = doc.getTextWidth(text) + Math.max(0, text.length - 1) * spacing;
  doc.text(text, center - textWidth / 2, y);
}

let trimmedLogoPromise: Promise<string | null> | null = null;

async function loadTrimmedLogo() {
  if (trimmedLogoPromise) return trimmedLogoPromise;
  trimmedLogoPromise = new Promise<string | null>((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) return resolve(null);
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < canvas.height; y += 2) {
          for (let x = 0; x < canvas.width; x += 2) {
            const index = (y * canvas.width + x) * 4;
            const visible = Math.min(pixels[index], pixels[index + 1], pixels[index + 2]) < 235;
            if (!visible) continue;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
        if (maxX < 0 || maxY < 0) return resolve(null);
        const padding = 8;
        const cropX = Math.max(0, minX - padding);
        const cropY = Math.max(0, minY - padding);
        const cropWidth = Math.min(canvas.width - cropX, maxX - minX + padding * 2);
        const cropHeight = Math.min(canvas.height - cropY, maxY - minY + padding * 2);
        const cropped = document.createElement("canvas");
        cropped.width = cropWidth;
        cropped.height = cropHeight;
        cropped.getContext("2d")?.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        resolve(cropped.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = officialLogoUrl;
  });
  return trimmedLogoPromise;
}

async function drawBrand(doc: jsPDF, width: number, height: number, brandName: string) {
  const officialLogo = await loadTrimmedLogo();
  if (officialLogo) {
    const logoWidth = Math.min(width * 0.68, 68);
    const logoHeight = Math.min(height * 0.32, logoWidth * 0.34);
    doc.addImage(officialLogo, "PNG", (width - logoWidth) / 2, Math.max(1, height * 0.025), logoWidth, logoHeight, undefined, "FAST");
    return;
  }

  const center = width / 2;
  const logoSize = Math.max(11, Math.min(20, width * 0.18));
  const propertiesSize = Math.max(4.5, Math.min(7, width * 0.065));
  const top = Math.max(7, height * 0.12);
  const letters = brandName.toUpperCase().replace(/\s+PROPERTIES$/, "");

  doc.setTextColor(0);
  doc.setFont("times", "normal");
  doc.setFontSize(logoSize);
  const logoSpacing = Math.max(0.7, width * 0.014);
  doc.setCharSpace(logoSpacing);
  drawSpacedCenteredText(doc, letters, center, top, logoSpacing);
  doc.setCharSpace(0);

  const ruleY = top + Math.max(3.5, height * 0.065);
  const ruleHalf = Math.max(8, width * 0.105);
  const diamond = Math.max(0.9, width * 0.012);
  doc.setLineWidth(0.25);
  doc.line(center - ruleHalf, ruleY, center - diamond * 2, ruleY);
  doc.line(center + diamond * 2, ruleY, center + ruleHalf, ruleY);
  doc.setFillColor(0);
  doc.lines([[diamond, diamond], [diamond, -diamond], [-diamond, -diamond], [-diamond, diamond]], center - diamond, ruleY - diamond, [1, 1], "F", true);

  doc.setFont("times", "normal");
  doc.setFontSize(propertiesSize);
  const propertiesSpacing = Math.max(0.9, width * 0.018);
  doc.setCharSpace(propertiesSpacing);
  drawSpacedCenteredText(doc, "PROPERTIES", center, ruleY + Math.max(4, height * 0.065), propertiesSpacing);
  doc.setCharSpace(0);
}

function measureLabeledLine(doc: jsPDF, label: string, value: string, maxWidth: number, fontSize: number, maxLines = 2) {
  const safeValue = value.trim() || "À compléter";
  doc.setFont("times", "bold");
  doc.setFontSize(fontSize);
  const labelWidth = doc.getTextWidth(label);
  doc.setFont("times", "normal");
  const valueLines = doc.splitTextToSize(safeValue, Math.max(10, maxWidth - labelWidth - 1));
  const lines = valueLines.length ? valueLines : [safeValue];
  if (lines.length <= maxLines) return { labelWidth, valueLines: lines };
  const compactLast = `${lines[maxLines - 1].replace(/[.…]+$/, "")}…`;
  return { labelWidth, valueLines: [...lines.slice(0, maxLines - 1), compactLast] };
}

function drawLabeledLine(doc: jsPDF, label: string, value: string, x: number, y: number, maxWidth: number, fontSize: number, lineStep: number, maxLines = 2) {
  const { labelWidth, valueLines } = measureLabeledLine(doc, label, value, maxWidth, fontSize, maxLines);
  doc.setFont("times", "bold");
  doc.setFontSize(fontSize);
  doc.text(label, x, y);
  doc.setFont("times", "normal");
  valueLines.forEach((line, index) => doc.text(line, x + labelWidth + 1, y + index * lineStep));
  return valueLines.length * lineStep;
}

export async function generateKeyLabelPdf(keySet: KeySet, options: KeyLabelOptions) {
  const width = Math.max(35, options.widthMm);
  const height = Math.max(25, options.heightMm);
  const orientation = width >= height ? "landscape" : "portrait";
  const doc = new jsPDF({ orientation, unit: "mm", format: [width, height], compress: true });
  const margin = Math.max(4, Math.min(width, height) * 0.075);
  const brandName = options.brandName || "AZURKEYS PROPERTIES";
  const items = Array.isArray(keySet.expected_items) ? keySet.expected_items : [];
  const contentWidth = width - margin * 2;

  // Single label: match the supplied minimal fiche design.
  await drawBrand(doc, width, height, brandName);
  const propertyName = keySet.property?.name || keySet.name;
  const itemText = items.length ? items.map((item) => `${item.quantity}x ${item.label}`).join(" - ") : "Contenu à compléter";
  const rows = [
    ["Nom du bien :", propertyName],
    ["Adresse :", keySet.label_address || keySet.property?.address || "Adresse à compléter"],
    ["Guide d'arrivée :", keySet.arrival_instructions || "Voir le livret d'accueil"],
    ["Nombre d'élément :", itemText],
  ] as const;
  const codeSize = Math.max(7.5, Math.min(12, width * 0.105));
  const codeY = height - Math.max(5, height * 0.08);
  const bodyTop = Math.max(height * 0.36, height * 0.39);
  const bodyBottom = codeY - Math.max(4, height * 0.11);
  const initialSize = Math.max(5.3, Math.min(9, width * 0.082));
  // Long addresses or arrival instructions reduce the font slightly before
  // drawing, guaranteeing that wrapped lines stay above the code.
  let bodySize = initialSize;
  let lineStep = Math.max(3.8, bodySize * 0.48);
  let rowGap = Math.max(3.5, Math.min(7.5, height * 0.075));
  let maxLines = 2;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    lineStep = Math.max(3.8, bodySize * 0.48);
    rowGap = Math.max(3.5, Math.min(7.5, height * 0.075 - (initialSize - bodySize) * 0.3));
    const totalHeight = rows.reduce((sum, [label, value]) => sum + measureLabeledLine(doc, label, value, contentWidth, bodySize, maxLines).valueLines.length * lineStep, 0) + rowGap * (rows.length - 1);
    if (bodyTop + totalHeight <= bodyBottom || bodySize <= 5.3) break;
    bodySize = Math.max(5.3, bodySize - 0.45);
  }
  // On very small stickers, use one compact line per field as a final safety
  // net so the code at the bottom is never touched by long text.
  const compactHeight = rows.reduce((sum, [label, value]) => sum + measureLabeledLine(doc, label, value, contentWidth, bodySize, 1).valueLines.length * lineStep, 0) + rowGap * (rows.length - 1);
  if (bodyTop + compactHeight > bodyBottom) {
    maxLines = 1;
    rowGap = Math.min(rowGap, 2.4);
    lineStep = Math.min(lineStep, Math.max(2.8, (bodyBottom - bodyTop - rowGap * (rows.length - 1)) / rows.length));
  }
  let y = bodyTop;
  rows.forEach(([label, value], index) => {
    const usedHeight = drawLabeledLine(doc, label, value, margin, y, contentWidth, bodySize, lineStep, maxLines);
    y += usedHeight + (index === rows.length - 1 ? 0 : rowGap);
  });

  doc.setFont("times", "normal");
  doc.setFontSize(codeSize);
  doc.text(keySet.code, width / 2, codeY, { align: "center" });

  doc.setProperties({
    title: `Étiquette ${keySet.code}`,
    subject: `Destination NFC : ${options.nfcUrl}`,
    author: brandName,
    creator: "MyWelcome",
  });

  doc.save(`etiquette-${keySet.code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
}
