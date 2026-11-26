// ============================================================================
// ShiftNote AU Mobile - Native PDF Invoice Generation & Sharing
// Generates ATO & NDIS compliant GST-Free Tax Invoices and triggers native share
// ============================================================================

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { formatInvoiceReference } from "./ndis-catalogue";
import type { Participant, ShiftAndClaim, WorkerProfile } from "./types";

export interface MobilePdfOptions {
  claim: ShiftAndClaim;
  participant: Participant;
  worker: WorkerProfile;
}

/**
 * Standard PDF fonts only support WinAnsi characters. Replace common Unicode
 * punctuation and drop anything else so user-entered names or dictated notes
 * (emoji, smart quotes, macrons, line breaks) can't crash PDF generation.
 */
export function toWinAnsiSafe(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201F]/g, '"')
    .replace(/[\u2013]/g, "-")
    .replace(/[\u2014]/g, "-")
    .replace(/[\u2026]/g, "...")
    .replace(/[\r\n\t]+/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "")
    .replace(/ {2,}/g, " ")
    .replace(/ +\)/g, ")")
    .trim();
}

/** Greedy word-wrap so long OCR descriptions and case notes are never truncated. */
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = toWinAnsiSafe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export async function generateAndShareMobileInvoice(
  options: MobilePdfOptions
): Promise<string> {
  const { claim, participant, worker } = options;

  // 1. Generate PDF in memory with pdf-lib
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Tax Invoice ${claim.invoice_number} - ${participant.full_name}`);
  const pageSize: [number, number] = [595.28, 841.89]; // A4 Portrait
  let page: PDFPage = pdfDoc.addPage(pageSize);
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(0.06, 0.09, 0.16);
  const teal = rgb(0.05, 0.58, 0.53);
  const margin = 40;

  // Start a new page when the next block would run off the bottom
  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdfDoc.addPage(pageSize);
      y = height - margin;
    }
  };

  // Top header banner
  page.drawRectangle({
    x: 0,
    y: height - 90,
    width,
    height: 90,
    color: navy,
  });

  page.drawText("TAX INVOICE", {
    x: margin,
    y: height - 42,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("AUSTRALIAN NDIS CORE SUPPORTS - GST-FREE SUPPLY (s38-38)", {
    x: margin,
    y: height - 60,
    size: 9,
    font: fontRegular,
    color: rgb(0.6, 0.85, 0.8),
  });

  // Invoice & Worker Metadata
  let y = height - 120;
  page.drawText(toWinAnsiSafe(`Provider: ${worker.business_name} (ABN: ${worker.abn})`), {
    x: margin,
    y,
    size: 10,
    font: fontBold,
    color: navy,
  });

  y -= 16;
  page.drawText(`Invoice No: ${claim.invoice_number}  |  Date: ${claim.shift_date}`, {
    x: margin,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.45),
  });

  y -= 16;
  const invoiceRef = formatInvoiceReference(participant.ndis_number, participant.full_name);
  page.drawText(toWinAnsiSafe(`Participant: ${participant.full_name} (${invoiceRef})`), {
    x: margin,
    y,
    size: 10,
    font: fontBold,
    color: teal,
  });

  y -= 16;
  page.drawText(toWinAnsiSafe(`Plan Manager: ${participant.plan_manager_name || "Self-Managed"}`), {
    x: margin,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.45),
  });

  // Divider
  y -= 18;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  // Line items table
  y -= 25;
  page.drawText("NDIS Item Description", { x: margin, y, size: 9, font: fontBold, color: navy });
  page.drawText("Qty", { x: width - 180, y, size: 9, font: fontBold, color: navy });
  page.drawText("Rate", { x: width - 130, y, size: 9, font: fontBold, color: navy });
  page.drawText("Total (AUD)", { x: width - margin - 50, y, size: 9, font: fontBold, color: navy });

  y -= 10;
  const descWidth = width - 180 - margin - 20;
  for (const item of claim.line_items) {
    // Plan Manager OCR needs the full "{code} - {name} ({date}, {start}-{end})" string
    const descLines = wrapText(item.description, fontRegular, 8, descWidth);
    ensureSpace(18 + (descLines.length - 1) * 10);
    y -= 18;
    page.drawText(`${item.quantity} ${item.unit}`, { x: width - 180, y, size: 8, font: fontRegular, color: navy });
    page.drawText(`$${item.unit_price.toFixed(2)}`, { x: width - 130, y, size: 8, font: fontRegular, color: navy });
    page.drawText(`$${item.line_total.toFixed(2)}`, { x: width - margin - 50, y, size: 8, font: fontBold, color: navy });
    descLines.forEach((line, idx) => {
      if (idx > 0) y -= 10;
      page.drawText(line, { x: margin, y, size: 8, font: fontRegular, color: navy });
    });
  }

  // Total summary
  ensureSpace(25 + 20 + 35 + 48);
  y -= 25;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  y -= 20;
  page.drawText("TOTAL AMOUNT DUE (GST-FREE):", {
    x: width - 290,
    y,
    size: 10,
    font: fontBold,
    color: navy,
  });
  const totalLabel = `$${claim.total_amount.toFixed(2)} AUD`;
  page.drawText(totalLabel, {
    // Right-align so larger totals don't run off the page
    x: width - margin - fontBold.widthOfTextAtSize(totalLabel, 12),
    y,
    size: 12,
    font: fontBold,
    color: teal,
  });

  // EFT Banking Details
  y -= 35;
  page.drawRectangle({
    x: margin,
    y: y - 40,
    width: width - margin * 2,
    height: 48,
    color: rgb(0.96, 0.98, 0.99),
    borderColor: rgb(0.85, 0.9, 0.92),
    borderWidth: 1,
  });
  page.drawText(`Payment Remittance: BSB ${worker.bsb}  |  Account ${worker.account_number}  |  Terms: 7 Days`, {
    x: margin + 12,
    y: y - 18,
    size: 9,
    font: fontBold,
    color: navy,
  });
  page.drawText("GST-Free under s38-38 of A New Tax System (Goods and Services Tax) Act 1999", {
    x: margin + 12,
    y: y - 32,
    size: 8,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.5),
  });

  // 3-Part Clinical Case Notes on Audit Page
  y -= 70;
  ensureSpace(16);
  page.drawText("NDIS QUALITY & SAFEGUARDS COMMISSION AUDIT CASE NOTES", {
    x: margin,
    y,
    size: 9,
    font: fontBold,
    color: teal,
  });

  const noteSections: Array<[string, string]> = [
    ["1. Activities Delivered:", claim.case_note_activities],
    ["2. Participant Engagement & Choice:", claim.case_note_engagement],
    ["3. NDIS Plan Goals Progress:", claim.case_note_goals],
  ];
  for (const [title, body] of noteSections) {
    y -= 16;
    ensureSpace(12);
    page.drawText(title, { x: margin, y, size: 8.5, font: fontBold, color: navy });
    // Case notes are audit records: wrap the full text instead of cutting at 140 chars
    for (const line of wrapText(body, fontRegular, 7.5, width - margin * 2)) {
      y -= 11;
      ensureSpace(0);
      page.drawText(line, { x: margin, y, size: 7.5, font: fontRegular, color: rgb(0.2, 0.25, 0.3) });
    }
  }

  // 2. Serialise straight to base64 (Node's Buffer doesn't exist in React Native)
  const base64Data = await pdfDoc.saveAsBase64();
  const fileName = `${claim.invoice_number.replace(/[^A-Za-z0-9_-]/g, "_")}_NDIS_Invoice.pdf`;
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // 3. Trigger native iOS / Android share dialog
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "application/pdf",
      dialogTitle: `Tax Invoice ${claim.invoice_number}`,
      UTI: "com.adobe.pdf",
    });
  }

  return fileUri;
}

