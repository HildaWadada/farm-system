import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Order } from "./api";

const CROP_LABELS: Record<string, string> = {
  dragon_fruit: "Dragon fruit",
  citrus: "Citrus",
  hass_avocado: "Hass avocado",
  chilli: "Chilli",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  cancelled: "Cancelled",
};

function money(n: number | string): string {
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function orderCode(id: string): string {
  return `ORD-${id.slice(0, 6).toUpperCase()}`;
}

function fullDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Builds and downloads a single-order receipt as a PDF. Used both right after
 * a supervisor saves a new order, and on-demand from the owner's dashboard —
 * same function, same look, generated fresh from the order's own data each
 * time rather than stored anywhere.
 */
export function generateOrderReceipt(order: Order) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(47, 82, 51); // forest green
  doc.text("Cliff's Farm", 14, 20);

  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  doc.text("Sales Receipt", 14, 27);

  doc.setFontSize(9);
  doc.setTextColor(140, 129, 117);
  doc.text(orderCode(order.id), 196, 20, { align: "right" });
  doc.text(fullDate(order.created_at), 196, 25, { align: "right" });

  doc.setDrawColor(230, 225, 210);
  doc.line(14, 32, 196, 32);

  doc.setFontSize(10);
  doc.setTextColor(42, 36, 32);
  doc.text("Buyer", 14, 42);
  doc.setFontSize(12);
  doc.text(order.buyer.name, 14, 49);
  if (order.buyer.phone) {
    doc.setFontSize(9);
    doc.setTextColor(140, 129, 117);
    doc.text(order.buyer.phone, 14, 55);
  }

  doc.setFontSize(9);
  doc.setTextColor(140, 129, 117);
  doc.text("Status", 196, 42, { align: "right" });
  doc.setFontSize(12);
  doc.setTextColor(
    order.status === "paid" ? 47 : order.status === "cancelled" ? 179 : 138,
    order.status === "paid" ? 82 : order.status === "cancelled" ? 38 : 91,
    order.status === "paid" ? 51 : order.status === "cancelled" ? 30 : 0
  );
  doc.text(STATUS_LABELS[order.status] || order.status, 196, 49, { align: "right" });

  autoTable(doc, {
    startY: 64,
    head: [["Crop", "Quantity", "Price"]],
    body: [[CROP_LABELS[order.crop] || order.crop, `${order.quantity_kg} kg`, `KES ${money(order.price)}`]],
    headStyles: { fillColor: [47, 82, 51] },
    styles: { fontSize: 10, cellPadding: 4 },
  });

  const afterTable = (doc as any).lastAutoTable.finalY + 10;

  const rows: [string, string][] = [["Subtotal", `KES ${money(order.price)}`]];
  if (Number(order.logistics_fee) > 0) {
    rows.push(["Logistics fee", `KES ${money(order.logistics_fee)}`]);
  }
  if (Number(order.tax) > 0) {
    rows.push(["Tax", `KES ${money(order.tax)}`]);
  }

  let y = afterTable;
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  for (const [label, value] of rows) {
    doc.text(label, 140, y);
    doc.text(value, 196, y, { align: "right" });
    y += 7;
  }

  doc.setDrawColor(230, 225, 210);
  doc.line(140, y, 196, y);
  y += 8;

  doc.setFontSize(13);
  doc.setTextColor(47, 82, 51);
  doc.text("Total", 140, y);
  doc.text(`KES ${money(order.total_amount)}`, 196, y, { align: "right" });

  doc.setFontSize(8);
  doc.setTextColor(140, 129, 117);
  doc.text("Thank you for your business.", 14, 280);

  doc.save(`receipt-${orderCode(order.id)}.pdf`);
}