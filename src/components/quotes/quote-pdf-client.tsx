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
import type { QuotePDFData } from "./quote-actions";

const PRIMARY    = "#121221";
const ACCENT     = "#ff9500";
const LIGHT_BG   = "#f5f5f8";
const BORDER     = "#e2e2ea";
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
  docTitle: {
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
  colQty:     { width: 52,  textAlign: "right" },
  colRate:    { width: 100, textAlign: "right" },
  colAmount:  { width: 110, textAlign: "right" },
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

export function QuoteDocument({ data }: { data: QuotePDFData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop */}
          <Image style={styles.logo} src="/logo.png" />
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>QUOTATION</Text>
            <Text style={styles.companyName}>
              JPR Brothers Construction (Pvt) Ltd
            </Text>
            <Text style={styles.companyAddress}>
              Puthukkulam, Kovilkkulam, Mannar, Sri Lanka.{"\n"}
              Phone Number: +94 77 818 0297
            </Text>
          </View>
        </View>

        {/* ── Info row: QUOTE TO | QUOTE NO. | DATE ── */}
        <View style={styles.infoRowBorder}>
          <View style={styles.infoRow}>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Quote To</Text>
              <Text style={styles.infoValue}>{data.clientName}</Text>
              {data.clientPhone ? (
                <Text style={styles.infoValueSub}>{data.clientPhone}</Text>
              ) : null}
              {data.projectName ? (
                <Text style={styles.infoValueSub}>{data.projectName}</Text>
              ) : null}
            </View>
            <View style={styles.infoCellCenter}>
              <Text style={styles.infoLabel}>Quote No.</Text>
              <Text style={styles.infoValue}>{data.quoteNumber}</Text>
            </View>
            <View style={styles.infoCellRight}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{data.createdAt}</Text>
              {data.validUntil ? (
                <>
                  <Text style={[styles.infoLabel, { marginTop: 6 }]}>
                    Valid Until
                  </Text>
                  <Text style={styles.infoValue}>{data.validUntil}</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Items Table ── */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colService, styles.thText]}>Service</Text>
          <Text style={[styles.colQty,    styles.thText]}>Qty</Text>
          <Text style={[styles.colRate,   styles.thText]}>Rate</Text>
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
            <Text style={[styles.colQty, styles.tdText]}>
              {item.quantity}{item.unit ? ` ${item.unit}` : ""}
            </Text>
            <Text style={[styles.colRate, styles.tdText]}>
              {fmtLKR(item.rate)}
            </Text>
            <Text style={[styles.colAmount, styles.tdText]}>
              {fmtLKR(item.amount)}
            </Text>
          </View>
        ))}

        {/* ── Bottom: message (left) + Totals (right) ── */}
        <View style={styles.bottomSection}>
          <Text style={styles.thankYou}>
            This is a quotation only.{"\n"}Prices are valid until{" "}
            {data.validUntil ?? "further notice"}.
          </Text>

          <View style={styles.totalsBlock}>
            <View style={[styles.totalRow, styles.totalRowShaded]}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{fmtLKR(data.subtotal)}</Text>
            </View>
            <View style={styles.totalRowFinal}>
              <Text style={styles.totalLabelFinal}>Total</Text>
              <Text style={styles.totalValueFinal}>{fmtLKR(data.total)}</Text>
            </View>
          </View>
        </View>

        {/* ── Notes ── */}
        {data.notes ? (
          <View style={styles.notes}>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            If you have any questions about this quotation, please contact
          </Text>
          <Text style={styles.footerPhone}>
            +94 77 818 0297 / +94 77 136 2056
          </Text>
        </View>

      </Page>
    </Document>
  );
}

export async function downloadPDF(data: QuotePDFData, filename: string) {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(<QuoteDocument data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PDFDownloadButton({ data }: { data: QuotePDFData }) {
  return (
    <PDFDownloadLink
      document={<QuoteDocument data={data} />}
      fileName={`${data.quoteNumber}.pdf`}
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
