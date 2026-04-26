"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  PDFDownloadLink,
} from "@react-pdf/renderer";
import { Download } from "lucide-react";
import type { InvoicePDFData } from "./invoice-actions";

export interface CompanyProfile {
  companyName: string;
  address?: string | null;
  phone?: string | null;
  invoiceFooterNote?: string | null;
}

const PRIMARY  = "#121221"; // dark navy from logo
const ACCENT   = "#ff9500"; // orange from logo
const LIGHT_BG = "#f5f5f8";
const BORDER   = "#e2e2ea";
const TEXT_MUTED = "#666666";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    paddingTop: 36,
    paddingBottom: 64,
    paddingHorizontal: 40,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },

  // ── Header: logo left, company+title right ───────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  logo: {
    width: 90,
    height: 90,
  },
  headerRight: {
    alignItems: "flex-end",
    flex: 1,
    paddingLeft: 16,
  },
  invoiceTitle: {
    fontSize: 36,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    letterSpacing: 4,
    marginBottom: 6,
  },
  companyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    textTransform: "uppercase",
    textAlign: "right",
  },
  companyAddress: {
    fontSize: 9,
    color: TEXT_MUTED,
    textAlign: "right",
    lineHeight: 1.5,
    marginTop: 2,
  },

  // ── Info row: INVOICE TO | INVOICE NO. | DATE ────────────
  infoRowBorder: {
    borderTop: `1.5 solid ${PRIMARY}`,
    borderBottom: `1.5 solid ${PRIMARY}`,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: "row",
    paddingVertical: 8,
  },
  infoCell: {
    flex: 1,
  },
  infoCellCenter: {
    flex: 1,
    borderLeft: `1 solid ${BORDER}`,
    paddingLeft: 12,
  },
  infoCellRight: {
    flex: 1,
    borderLeft: `1 solid ${BORDER}`,
    paddingLeft: 12,
    alignItems: "flex-end",
  },
  infoLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
  },
  infoValueSub: {
    fontSize: 9,
    color: TEXT_MUTED,
    marginTop: 1,
  },

  // ── Table ────────────────────────────────────────────────
  tableHeader: {
    flexDirection: "row",
    backgroundColor: PRIMARY,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottom: `1 solid ${BORDER}`,
  },
  tableRowAlt: {
    backgroundColor: LIGHT_BG,
  },
  thText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tdText: {
    fontSize: 10,
    color: "#1a1a1a",
  },
  colService: { flex: 1 },
  colHours:   { width: 52,  textAlign: "right" },
  colRate:    { width: 100, textAlign: "right" },
  colAmount:  { width: 110, textAlign: "right" },

  // ── Bottom section: thank you (left) + totals (right) ────
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 14,
  },
  thankYou: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    flex: 1,
    paddingTop: 8,
  },
  totalsBlock: {
    width: 250,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottom: `1 solid ${BORDER}`,
  },
  totalRowShaded: {
    backgroundColor: LIGHT_BG,
  },
  totalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 9,
    textAlign: "right",
    minWidth: 100,
  },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: PRIMARY,
  },
  totalLabelFinal: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalValueFinal: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textAlign: "right",
    minWidth: 100,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#fff3cd",
    marginTop: 2,
  },
  balanceLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#856404",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#856404",
    textAlign: "right",
    minWidth: 100,
  },

  // ── Notes ────────────────────────────────────────────────
  notes: {
    marginTop: 12,
    padding: 10,
    backgroundColor: LIGHT_BG,
    borderLeft: `3 solid ${ACCENT}`,
  },
  notesText: {
    fontSize: 9,
    color: "#444",
    lineHeight: 1.5,
  },

  // ── Footer ───────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTop: `1 solid ${BORDER}`,
    paddingTop: 8,
    alignItems: "center",
  },
  footerText: {
    fontSize: 9,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 1.5,
  },
  footerPhone: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    textAlign: "center",
    marginTop: 2,
  },
});

function fmtLKR(value: string | number | null | undefined): string {
  const n = parseFloat(String(value ?? 0));
  return `${n.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}LKR`;
}

export function InvoiceDocument({ data, company }: { data: InvoicePDFData; company?: CompanyProfile }) {
  const discount  = parseFloat(data.discountAmount ?? "0") || 0;
  const tax       = parseFloat(data.taxAmount ?? "0") || 0;
  const totalPaid = (data.payments ?? []).reduce((s, p) => s + parseFloat(p.amount), 0);
  const balance   = Math.max(0, parseFloat(data.total) - totalPaid);

  const companyName = company?.companyName ?? "JPR Brothers Construction (Pvt) Ltd";
  const companyAddress = company?.address ?? "Puthukkulam, Kovilkkulam, Mannar, Sri Lanka.";
  const companyPhone = company?.phone ?? "+94 77 818 0297";
  const footerNote = company?.invoiceFooterNote ?? "If you have any questions about this invoice, please contact";

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop */}
          <Image style={styles.logo} src="/logo.png" />
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.companyName}>
              {companyName}
            </Text>
            <Text style={styles.companyAddress}>
              {companyAddress}{"\n"}
              Phone Number: {companyPhone}
            </Text>
          </View>
        </View>

        {/* ── Info row: INVOICE TO | INVOICE NO. | DATE ── */}
        <View style={styles.infoRowBorder}>
          <View style={styles.infoRow}>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Invoice To</Text>
              <Text style={styles.infoValue}>{data.clientName}</Text>
              {data.clientPhone ? (
                <Text style={styles.infoValueSub}>{data.clientPhone}</Text>
              ) : null}
              {data.projectName ? (
                <Text style={styles.infoValueSub}>{data.projectName}</Text>
              ) : null}
            </View>
            <View style={styles.infoCellCenter}>
              <Text style={styles.infoLabel}>Invoice No.</Text>
              <Text style={styles.infoValue}>{data.invoiceNumber}</Text>
            </View>
            <View style={styles.infoCellRight}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{data.createdAt}</Text>
              {data.paymentDueDate ? (
                <>
                  <Text style={[styles.infoLabel, { marginTop: 6 }]}>
                    Due Date
                  </Text>
                  <Text style={styles.infoValue}>{data.paymentDueDate}</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Items Table ── */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colService, styles.thText]}>Service</Text>
          <Text style={[styles.colHours,  styles.thText]}>Hours</Text>
          <Text style={[styles.colRate,   styles.thText]}>Hourly Rate</Text>
          <Text style={[styles.colAmount, styles.thText]}>Amount</Text>
        </View>
        {data.items.map((item, i) => (
          <View
            key={i}
            style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
          >
            <Text style={[styles.colService, styles.tdText]}>
              {item.description}
            </Text>
            <Text style={[styles.colHours, styles.tdText]}>
              {item.quantity}
            </Text>
            <Text style={[styles.colRate, styles.tdText]}>
              {fmtLKR(item.rate)}
            </Text>
            <Text style={[styles.colAmount, styles.tdText]}>
              {fmtLKR(item.amount)}
            </Text>
          </View>
        ))}

        {/* ── Bottom: Thank You (left) + Totals (right) ── */}
        <View style={styles.bottomSection}>
          <Text style={styles.thankYou}>Thank you for your business.</Text>

          <View style={styles.totalsBlock}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{fmtLKR(data.subtotal)}</Text>
            </View>
            <View style={[styles.totalRow, styles.totalRowShaded]}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>
                {discount > 0 ? `-${fmtLKR(discount)}` : "-LKR"}
              </Text>
            </View>
            {tax > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax</Text>
                <Text style={styles.totalValue}>{fmtLKR(tax)}</Text>
              </View>
            )}
            <View style={styles.totalRowFinal}>
              <Text style={styles.totalLabelFinal}>Total</Text>
              <Text style={styles.totalValueFinal}>{fmtLKR(data.total)}</Text>
            </View>

            {(data.payments ?? []).map((p, i) => (
              <View key={i} style={[styles.totalRow, styles.totalRowShaded]}>
                <View style={{ flex: 1, paddingRight: 6 }}>
                  <Text style={styles.totalLabel}>
                    Paid · {p.paymentType} · {p.paymentDate}
                  </Text>
                </View>
                <Text style={[styles.totalValue, { flexShrink: 0 }]}>
                  {fmtLKR(p.amount)}
                </Text>
              </View>
            ))}

            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Balance Amount</Text>
              <Text style={styles.balanceValue}>{fmtLKR(balance)}</Text>
            </View>
          </View>
        </View>

        {/* ── Notes ── */}
        {data.notes ? (
          <View style={styles.notes}>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        ) : null}

        {/* ── Footer (centered) ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {footerNote}
          </Text>
          <Text style={styles.footerPhone}>
            {companyPhone}
          </Text>
        </View>

      </Page>
    </Document>
  );
}

export async function downloadPDF(data: InvoicePDFData, filename: string, company?: CompanyProfile) {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(<InvoiceDocument data={data} company={company} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PDFDownloadButton({ data, company }: { data: InvoicePDFData; company?: CompanyProfile }) {
  return (
    <PDFDownloadLink
      document={<InvoiceDocument data={data} company={company} />}
      fileName={`${data.invoiceNumber}.pdf`}
      className="flex-1 flex items-center justify-center gap-2 h-11 bg-primary text-primary-foreground rounded-xl font-semibold text-sm"
    >
      {({ loading }) =>
        loading ? (
          "Preparing..."
        ) : (
          <>
            <Download className="h-4 w-4" />
            Download PDF
          </>
        )
      }
    </PDFDownloadLink>
  );
}
