'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_ORG_ID } from '@/config/constants'

export interface CloudProduct {
  sku: string           // 貨號
  name: string          // 品名
  unit_price: number    // 單價
  unit?: string         // 單位
  description?: string  // 描述
  category?: string     // 分類
}

export interface CloudProductSettings {
  google_sheet_url: string | null
  last_synced_at: string | null
}

// Extract Google Sheet ID from URL
function extractSheetId(url: string): string | null {
  // Handle various Google Sheets URL formats
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/,
    /^([a-zA-Z0-9-_]+)$/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Fetch products from Google Sheets (published as CSV)
export async function fetchCloudProducts(sheetUrl: string): Promise<{
  data: CloudProduct[] | null
  error: string | null
}> {
  try {
    const sheetId = extractSheetId(sheetUrl)
    if (!sheetId) {
      return { data: null, error: '無效的 Google Sheet 連結' }
    }

    // Convert to CSV export URL
    // Format: https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid=0
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`

    const response = await fetch(csvUrl, {
      headers: {
        'Accept': 'text/csv',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      if (response.status === 404) {
        return { data: null, error: 'Google Sheet 不存在或未公開分享' }
      }
      return { data: null, error: `無法讀取 Google Sheet (${response.status})` }
    }

    const csvText = await response.text()
    const products = parseCSV(csvText)

    return { data: products, error: null }
  } catch (error) {
    console.error('Error fetching cloud products:', error)
    return { data: null, error: '讀取雲端產品資料失敗，請確認連結是否正確且已公開分享' }
  }
}

// Parse CSV to products
function parseCSV(csvText: string): CloudProduct[] {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  // Parse header row
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim())

  // Find column indices (support both Chinese and English headers)
  const skuIndex = headers.findIndex(h =>
    h === 'sku' || h === '貨號' || h === '產品編號' || h === '編號' || h === 'product_code' || h === 'code'
  )
  const nameIndex = headers.findIndex(h =>
    h === 'name' || h === '品名' || h === '產品名稱' || h === '名稱' || h === 'product_name'
  )
  const priceIndex = headers.findIndex(h =>
    h === 'price' || h === 'unit_price' || h === '單價' || h === '價格' || h === '售價'
  )
  const unitIndex = headers.findIndex(h =>
    h === 'unit' || h === '單位'
  )
  const descIndex = headers.findIndex(h =>
    h === 'description' || h === '描述' || h === '說明'
  )
  const categoryIndex = headers.findIndex(h =>
    h === 'category' || h === '分類' || h === '類別'
  )

  if (skuIndex === -1 || priceIndex === -1) {
    // If no proper headers, assume first column is SKU, second is name, third is price
    return lines.slice(1).map(line => {
      const values = parseCSVLine(line)
      return {
        sku: values[0]?.trim() || '',
        name: values[1]?.trim() || values[0]?.trim() || '',
        unit_price: parseFloat(values[2]?.replace(/[,$]/g, '') || '0') || 0,
        unit: values[3]?.trim(),
      }
    }).filter(p => p.sku && p.unit_price > 0)
  }

  // Parse data rows
  const products: CloudProduct[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])

    const sku = values[skuIndex]?.trim()
    const priceStr = values[priceIndex]?.replace(/[,$]/g, '').trim()
    const price = parseFloat(priceStr || '0')

    if (sku && price > 0) {
      products.push({
        sku,
        name: nameIndex >= 0 ? values[nameIndex]?.trim() || sku : sku,
        unit_price: price,
        unit: unitIndex >= 0 ? values[unitIndex]?.trim() : undefined,
        description: descIndex >= 0 ? values[descIndex]?.trim() : undefined,
        category: categoryIndex >= 0 ? values[categoryIndex]?.trim() : undefined,
      })
    }
  }

  return products
}

// Parse a single CSV line (handling quoted values)
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)

  return result
}

// Save Google Sheet URL to settings
export async function saveCloudProductSettings(
  sheetUrl: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()

    // Validate the sheet URL first
    if (sheetUrl) {
      const { data: testData, error: testError } = await fetchCloudProducts(sheetUrl)
      if (testError) {
        return { success: false, error: testError }
      }
      if (!testData || testData.length === 0) {
        return { success: false, error: '無法從 Google Sheet 讀取產品資料，請確認格式正確' }
      }
    }

    // Update organization settings
    const { error } = await supabase
      .from('organization_settings')
      .update({
        google_sheet_url: sheetUrl || null,
        cloud_products_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('org_id', DEFAULT_ORG_ID)

    if (error) throw error

    revalidatePath('/settings')
    return { success: true, error: null }
  } catch (error) {
    console.error('Error saving cloud product settings:', error)
    return { success: false, error: '儲存設定失敗' }
  }
}

// Get cloud product settings
export async function getCloudProductSettings(): Promise<{
  data: CloudProductSettings | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organization_settings')
      .select('google_sheet_url, cloud_products_synced_at')
      .eq('org_id', DEFAULT_ORG_ID)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return {
      data: {
        google_sheet_url: data?.google_sheet_url || null,
        last_synced_at: data?.cloud_products_synced_at || null,
      },
      error: null,
    }
  } catch (error) {
    console.error('Error fetching cloud product settings:', error)
    return { data: null, error: '無法載入雲端產品設定' }
  }
}

// Get product by SKU from cloud
export async function getCloudProductBySku(
  sheetUrl: string,
  sku: string
): Promise<{ data: CloudProduct | null; error: string | null }> {
  const { data: products, error } = await fetchCloudProducts(sheetUrl)

  if (error) return { data: null, error }
  if (!products) return { data: null, error: '無產品資料' }

  const product = products.find(p =>
    p.sku.toLowerCase() === sku.toLowerCase()
  )

  return { data: product || null, error: null }
}

// Search products from cloud
export async function searchCloudProducts(
  sheetUrl: string,
  query: string
): Promise<{ data: CloudProduct[] | null; error: string | null }> {
  const { data: products, error } = await fetchCloudProducts(sheetUrl)

  if (error) return { data: null, error }
  if (!products) return { data: [], error: null }

  const lowerQuery = query.toLowerCase()
  const filtered = products.filter(p =>
    p.sku.toLowerCase().includes(lowerQuery) ||
    p.name.toLowerCase().includes(lowerQuery)
  )

  return { data: filtered.slice(0, 20), error: null } // Limit to 20 results
}
