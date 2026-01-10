'use client'

import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer'
import type { QuoteWithRelations } from '@/types'

// Register Chinese font
Font.register({
  family: 'NotoSansSC',
  src: 'https://fonts.gstatic.com/s/notosanssc/v36/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYlNbPzS5HE.ttf',
})

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'NotoSansSC',
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  quoteNumber: {
    fontSize: 12,
    color: '#666666',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  infoBox: {
    width: '48%',
  },
  infoTitle: {
    fontSize: 10,
    color: '#888888',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  infoText: {
    fontSize: 11,
    marginBottom: 4,
  },
  infoTextBold: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableColProduct: {
    width: '40%',
  },
  tableColQty: {
    width: '15%',
    textAlign: 'center',
  },
  tableColPrice: {
    width: '20%',
    textAlign: 'right',
  },
  tableColTotal: {
    width: '25%',
    textAlign: 'right',
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  tableText: {
    fontSize: 10,
    color: '#374151',
  },
  tableTextSmall: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2,
  },
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 10,
    color: '#374151',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#374151',
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  termsSection: {
    marginTop: 40,
  },
  termsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  termsText: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
  },
})

interface QuotePDFProps {
  quote: QuoteWithRelations
}

const formatCurrency = (amount: number, currency: string) => {
  const symbol = currency === 'USD' ? '$' : currency === 'CNY' ? '¥' : 'NT$'
  return `${symbol}${new Intl.NumberFormat('zh-TW').format(Math.round(amount))}`
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-TW')
}

export function QuotePDFDocument({ quote }: QuotePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>報價單</Text>
          <Text style={styles.quoteNumber}>{quote.quote_number}</Text>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>客戶資訊</Text>
            <Text style={styles.infoTextBold}>{quote.customer?.company_name}</Text>
            {quote.customer?.contact_name && (
              <Text style={styles.infoText}>{quote.customer.contact_name}</Text>
            )}
            {quote.customer?.contact_email && (
              <Text style={styles.infoText}>{quote.customer.contact_email}</Text>
            )}
            {quote.customer?.contact_phone && (
              <Text style={styles.infoText}>{quote.customer.contact_phone}</Text>
            )}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>報價資訊</Text>
            <Text style={styles.infoText}>報價單號：{quote.quote_number}</Text>
            <Text style={styles.infoText}>開立日期：{formatDate(quote.issue_date)}</Text>
            <Text style={styles.infoText}>有效期限：{formatDate(quote.valid_until)}</Text>
            <Text style={styles.infoText}>幣別：{quote.currency}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.tableColProduct]}>產品/服務</Text>
            <Text style={[styles.tableHeaderText, styles.tableColQty]}>數量</Text>
            <Text style={[styles.tableHeaderText, styles.tableColPrice]}>單價</Text>
            <Text style={[styles.tableHeaderText, styles.tableColTotal]}>小計</Text>
          </View>
          {quote.items?.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <View style={styles.tableColProduct}>
                <Text style={styles.tableText}>{item.product_name}</Text>
                {item.product_description && (
                  <Text style={styles.tableTextSmall}>{item.product_description}</Text>
                )}
              </View>
              <Text style={[styles.tableText, styles.tableColQty]}>
                {item.quantity} {item.unit}
              </Text>
              <Text style={[styles.tableText, styles.tableColPrice]}>
                {formatCurrency(item.unit_price, quote.currency)}
              </Text>
              <Text style={[styles.tableText, styles.tableColTotal]}>
                {formatCurrency(item.line_total, quote.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>小計</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(quote.subtotal, quote.currency)}
            </Text>
          </View>
          {quote.discount_amount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>折扣</Text>
              <Text style={styles.totalValue}>
                -{formatCurrency(quote.discount_amount, quote.currency)}
              </Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>稅額 ({(quote.tax_rate * 100).toFixed(0)}%)</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(quote.tax_amount, quote.currency)}
            </Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>總計</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(quote.total_amount, quote.currency)}
            </Text>
          </View>
        </View>

        {/* Terms */}
        {(quote.payment_terms || quote.delivery_terms || quote.notes) && (
          <View style={styles.termsSection}>
            <Text style={styles.termsTitle}>條款與備註</Text>
            {quote.payment_terms && (
              <Text style={styles.termsText}>付款條件：{quote.payment_terms}</Text>
            )}
            {quote.delivery_terms && (
              <Text style={styles.termsText}>交貨條件：{quote.delivery_terms}</Text>
            )}
            {quote.notes && <Text style={styles.termsText}>備註：{quote.notes}</Text>}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>此報價單由報價單管理系統產生</Text>
      </Page>
    </Document>
  )
}

export async function generateQuotePDF(quote: QuoteWithRelations): Promise<Blob> {
  const blob = await pdf(<QuotePDFDocument quote={quote} />).toBlob()
  return blob
}

export function downloadQuotePDF(quote: QuoteWithRelations) {
  generateQuotePDF(quote).then((blob) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${quote.quote_number}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  })
}
