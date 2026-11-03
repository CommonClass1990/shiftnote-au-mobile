// ============================================================================
// ShiftNote AU Mobile - Native PDF Invoice Generation & Sharing
// Generates ATO & NDIS compliant GST-Free Tax Invoices and triggers native share
// ============================================================================

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatInvoiceReference } from "./ndis-catalogue";
import type { Participant, ShiftAndClaim, WorkerProfile } from "./types";

export interface MobilePdfOptions {
  claim: ShiftAndClaim;
  participant: Participant;
  worker: WorkerProfile;
}

export async function generateAndShareMobileInvoice(
  options: MobilePdfOptions
): Promise<string> {
  const { claim, participant, worker } = options;

  // 1. Generate PDF in memory with pdf-lib
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Tax Invoice ${claim.invoice_number} - ${participant.full_name}`);
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Portrait
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(0.06, 0.09, 0.16);
  const teal = rgb(0.05, 0.58, 0.53);
  const margin = 40;

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

  page.drawText("AUSTRALIAN NDIS CORE SUPPORTS — GST-FREE SUPPLY (s38-38)", {
    x: margin,
    y: height - 60,
    size: 9,
    font: fontRegular,
    color: rgb(0.6, 0.85, 0.8),
  });

  // Invoice & Worker Metadata
  let y = height - 120;
  page.drawText(`Provider: ${worker.business_name} (ABN: ${worker.abn})`, {
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
  page.drawText(`Participant: ${participant.full_name} (${invoiceRef})`, {
    x: margin,
    y,
    size: 10,
    font: fontBold,
    color: teal,
  });

  y -= 16;
  page.drawText(`Plan Manager: ${participant.plan_manager_name || "Self-Managed"}`, {
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
  for (const item of claim.line_items) {
    y -= 18;
    const shortDesc = item.description.length > 55 ? item.description.slice(0, 52) + "..." : item.description;
    page.drawText(shortDesc, { x: margin, y, size: 8, font: fontRegular, color: navy });
    page.drawText(`${item.quantity} ${item.unit}`, { x: width - 180, y, size: 8, font: fontRegular, color: navy });
    page.drawText(`$${item.unit_price.toFixed(2)}`, { x: width - 130, y, size: 8, font: fontRegular, color: navy });
    page.drawText(`$${item.line_total.toFixed(2)}`, { x: width - margin - 50, y, size: 8, font: fontBold, color: navy });
  }

  // Total summary
  y -= 25;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  y -= 20;
  page.drawText("TOTAL AMOUNT DUE (GST-FREE):", {
    x: width - 260,
    y,
    size: 10,
    font: fontBold,
    color: navy,
  });
  page.drawText(`$${claim.total_amount.toFixed(2)} AUD`, {
    x: width - margin - 50,
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
  page.drawText("NDIS QUALITY & SAFEGUARDS COMMISSION AUDIT CASE NOTES", {
    x: margin,
    y,
    size: 9,
    font: fontBold,
    color: teal,
  });

  y -= 16;
  page.drawText("1. Activities Delivered:", { x: margin, y, size: 8.5, font: fontBold, color: navy });
  y -= 12;
  const actNote = claim.case_note_activities.slice(0, 140);
  page.drawText(actNote, { x: margin, y, size: 7.5, font: fontRegular, color: rgb(0.2, 0.25, 0.3) });

  y -= 16;
  page.drawText("2. Participant Engagement & Choice:", { x: margin, y, size: 8.5, font: fontBold, color: navy });
  y -= 12;
  const engNote = claim.case_note_engagement.slice(0, 140);
  page.drawText(engNote, { x: margin, y, size: 7.5, font: fontRegular, color: rgb(0.2, 0.25, 0.3) });

  y -= 16;
  page.drawText("3. NDIS Plan Goals Progress:", { x: margin, y, size: 8.5, font: fontBold, color: navy });
  y -= 12;
  const goalNote = claim.case_note_goals.slice(0, 140);
  page.drawText(goalNote, { x: margin, y, size: 7.5, font: fontRegular, color: rgb(0.2, 0.25, 0.3) });

  const pdfBytes = await pdfDoc.save();

  // 2. Convert to base64 and write to device filesystem
  const base64Data = Buffer.from(pdfBytes).toString("base64");
  const fileName = `${claim.invoice_number}_NDIS_Invoice.pdf`;
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
