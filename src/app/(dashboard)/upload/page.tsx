'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { analyzeOpportunityRisks } from '@/lib/logic/advanced-risk-engine'

interface UploadResult {
    success: boolean
    message: string
    count?: number
}

// Helper to normalize keys and find value case-insensitive (Component Scope, or just inside component)
const getValue = (row: any, keys: string[]) => {
    const rowKeys = Object.keys(row)
    for (const key of keys) {
        // Exact match
        if (row[key] !== undefined) return row[key]

        // Case insensitive & Trim match
        const foundKey = rowKeys.find(k => k.toLowerCase().trim() === key.toLowerCase().trim())
        if (foundKey) return row[foundKey]
    }
    return undefined
}

export default function UploadPage() {
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<any[]>([])
    const [columns, setColumns] = useState<string[]>([])
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState<UploadResult | null>(null)
    const [uploadType, setUploadType] = useState<'opportunities' | 'sales' | 'aop' | 'channel_targets'>('opportunities')
    const [parsedData, setParsedData] = useState<any[]>([])

    const router = useRouter()
    const supabase = createClient()

    // Función para parsear montos (maneja formato europeo: 1.372,00 = 1372.00)
    const parseRevenueAmount = (value: string | number): number => {
        if (typeof value === 'number') return value
        if (!value) return 0

        let strValue = value.toString().trim()

        // Remove known currency symbols and text characters, keeping only numbers, dots, commas, minus, and parens
        // This fixes "$100" -> "100"
        strValue = strValue.replace(/[^\d.,\-()]/g, '')

        // Detectar si es negativo por paréntesis: (1.23) o (1,23)
        const isNegativeParenthesis = strValue.startsWith('(') && strValue.endsWith(')')
        // Detectar si es negativo por signo menos (asegurando que no sea guión de fecha si llega a pasar)
        const isNegativeSign = strValue.includes('-') && !Number.isNaN(parseFloat(strValue))

        let localStr = strValue
        if (isNegativeParenthesis) {
            localStr = strValue.slice(1, -1).trim()
        }

        // Detectar formato europeo vs americano sobre la cadena limpia de paréntesis
        // Europeo/LATAM: 1.372,00 (punto = miles, coma = decimal) OR 25.000 (punto = miles)
        // Americano: 1,372.00 (coma = miles, punto = decimal)

        // Regex para detectar "X.XXX" (miles con punto, sin coma decimal explícita)
        const isDotThousands = /^(\d{1,3})(\.\d{3})+$/.test(localStr);

        // Si tiene coma seguida de exactamente 2 dígitos al final, es formato europeo
        const isEuropeanFormat = /,\d{2}$/.test(localStr) ||
            (localStr.includes(',') && !localStr.includes('.')) ||
            (localStr.indexOf('.') < localStr.lastIndexOf(',')) ||
            isDotThousands; // Treat "25.000" as European (25000)

        // Clean: remove everything that remains that isn't a likely number part (though we already cleaned above)
        // But importantly here we unify separators
        let cleaned = localStr.replace(/\s/g, '')

        if (isEuropeanFormat) {
            // Formato europeo: quitar puntos (miles), reemplazar coma por punto (decimal)
            cleaned = cleaned.replace(/\./g, '').replace(',', '.')
        } else {
            // Formato americano: quitar comas (miles)
            cleaned = cleaned.replace(/,/g, '')
        }

        let result = parseFloat(cleaned) || 0

        // Aplicar signo negativo
        if ((isNegativeParenthesis || isNegativeSign) && result > 0) {
            result = result * -1
        }

        return result
    }

    // Función para normalizar país
    const normalizeCountry = (country: string): string => {
        const normalized = country?.toUpperCase().trim()
        if (normalized?.includes('PERU') || normalized?.includes('PERÚ')) return 'PERU'
        if (normalized?.includes('COLOMBIA')) return 'COLOMBIA'
        if (normalized?.includes('ECUADOR')) return 'ECUADOR'
        return 'PERU' // Default
    }

    // Función para parsear fechas
    const parseDate = (dateValue: string | number | Date): string => {
        if (!dateValue) return new Date().toISOString().split('T')[0]

        if (dateValue instanceof Date) {
            return dateValue.toISOString().split('T')[0]
        }

        if (typeof dateValue === 'number') {
            const excelEpoch = new Date(1899, 11, 30)
            const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000)
            return date.toISOString().split('T')[0]
        }

        const dateStr = String(dateValue).trim()

        if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            return dateStr.substring(0, 10)
        }

        const slashParts = dateStr.split('/')
        if (slashParts.length === 3) {
            const parts = slashParts.map(p => parseInt(p, 10))
            const first = parts[0]
            const second = parts[1]
            let third = parts[2]

            if (third < 100) {
                third = third < 50 ? 2000 + third : 1900 + third
            }

            let day: number, month: number, year: number

            if (first > 12) {
                day = first
                month = second
                year = third
            } else if (second > 12) {
                month = first
                day = second
                year = third
            } else {
                month = first
                day = second
                year = third
            }

            if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900) {
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            }
        }
        return new Date().toISOString().split('T')[0]
    }

    const parseFile = async (selectedFile: File): Promise<{ data: any[]; columns: string[] }> => {
        const fileName = selectedFile.name.toLowerCase()

        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = (e) => {
                    try {
                        const data = e.target?.result
                        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
                        const sheetName = workbook.SheetNames[0]
                        const worksheet = workbook.Sheets[sheetName]
                        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

                        let headerRowIndex = 0
                        const knownColumns = [
                            'Opportunity Name', 'Amount', 'Close Date', 'Win %', 'Go %', 'Account name', 'Installation Country',
                            'Nombre', 'Monto', 'Fecha Cierre', 'Win', 'Go', 'Cuenta', 'Pais', 'Probabilidad',
                            'Valor', 'Importe', 'Total', 'Precio', 'Ingresos', 'Monto Estimado',
                            'Probabilidad de Cierre', 'Probabilidad de Ganar', 'Channel', 'Canal', 'Target', 'Meta'
                        ]

                        for (let i = 0; i < Math.min(rawData.length, 20); i++) {
                            const row = rawData[i] || []
                            const matches = row.filter((cell: any) =>
                                typeof cell === 'string' &&
                                knownColumns.some(col => cell.trim().toLowerCase() === col.toLowerCase())
                            ).length

                            if (matches >= 2) {
                                headerRowIndex = i
                                break
                            }
                        }

                        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                            range: headerRowIndex,
                            defval: '',
                            raw: false,
                            dateNF: 'yyyy-mm-dd'
                        })

                        // Sanitize row keys function
                        const sanitizeKeys = (row: any) => {
                            const newRow: any = {};
                            Object.keys(row).forEach(k => {
                                const cleanKey = k.trim().replace(/^[\uFEFF\s]+|[\s]+$/g, '');
                                newRow[cleanKey] = row[k];
                            });
                            return newRow;
                        };

                        const cleanData = jsonData.map(row => sanitizeKeys(row as any));
                        const cols = cleanData.length > 0 ? Object.keys(cleanData[0] as object) : []
                        resolve({ data: cleanData, columns: cols })
                    } catch (err) {
                        reject(err)
                    }
                }
                reader.onerror = reject
                reader.readAsArrayBuffer(selectedFile)
            })
        } else {
            return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = (e) => {
                    try {
                        const text = e.target?.result as string
                        const lines = text.split('\n').filter(line => line.trim())
                        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
                        const data = lines.slice(1).map(line => {
                            const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
                            const row: any = {}
                            headers.forEach((header, idx) => {
                                row[header] = values[idx] || ''
                            })
                            return row
                        })
                        resolve({ data, columns: headers })
                    } catch (err) {
                        reject(err)
                    }
                }
                reader.onerror = reject
                reader.readAsText(selectedFile)
            })
        }
    }

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        setFile(selectedFile)
        setResult(null)

        try {
            const { data, columns } = await parseFile(selectedFile)
            setColumns(columns)
            setPreview(data.slice(0, 5))
            setParsedData(data)
        } catch {
            setResult({ success: false, message: 'Error al leer el archivo' })
        }
    }, [])

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault()
        const droppedFile = e.dataTransfer.files[0]
        const fileName = droppedFile?.name.toLowerCase() || ''

        if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            setFile(droppedFile)
            setResult(null)

            try {
                const { data, columns } = await parseFile(droppedFile)
                setColumns(columns)
                setPreview(data.slice(0, 5))
                setParsedData(data)
            } catch {
                setResult({ success: false, message: 'Error al leer el archivo' })
            }
        }
    }, [])

    const handleUpload = async () => {
        if (!file || parsedData.length === 0) return

        setUploading(true)
        setResult(null)

        try {
            const data = parsedData
            let insertCount = 0
            let duplicateCount = 0

            if (uploadType === 'opportunities') {
                const { data: accountsDb } = await supabase.from('accounts').select('id, name')
                const accountMap = new Map((accountsDb || []).map(a => [a.name.toUpperCase().trim(), a.id]))

                const findAccountId = (channelName: string): string | null => {
                    if (!channelName) return null
                    const normalized = channelName.toUpperCase().trim()
                    if (accountMap.has(normalized)) return accountMap.get(normalized)!
                    const firstWord = normalized.split(' ')[0]
                    if (firstWord.length > 3) {
                        const found = Array.from(accountMap.entries()).find(([name, id]) => name.includes(firstWord))
                        if (found) return found[1]
                    }
                    return null
                }

                const opportunities = data
                    .filter(row => getValue(row, ['Opportunity Name', 'Name', 'Nombre', 'Opportunity']))
                    .map(row => {
                        const name = getValue(row, ['Opportunity Name', 'Name', 'Nombre', 'Opportunity', 'Oportunidad', 'Proyecto'])
                        const channelName = getValue(row, ['Channel', 'Partner', 'Canal', 'Account Name', 'Account', 'Cuenta', 'Cliente']) || ''

                        // Enhanced Amount Mapping
                        const amountRaw = getValue(row, ['Amount', 'Monto', 'Total Amount', 'Revenue', 'Valor', 'Importe', 'Total', 'Precio', 'Ingresos', 'Monto Estimado'])
                        const amount = parseRevenueAmount(amountRaw || 0)

                        // Debug log for first row
                        if (data.indexOf(row) === 0) {
                            console.log('First Row Debug:', { name, amountRaw, amount, rowKeys: Object.keys(row) })
                        }

                        const parsePct = (val: any) => {
                            let res = 0;
                            if (typeof val === 'number') {
                                res = val <= 1 ? val : val / 100;
                            } else if (typeof val === 'string') {
                                const match = val.match(/(\d+)[,\.]?(\d*)?[\s]*%/);
                                if (match) {
                                    const numStr = val.replace('%', '').trim().replace(',', '.');
                                    res = parseFloat(numStr) / 100;
                                } else {
                                    const clean = val.replace(',', '.');
                                    const num = parseFloat(clean);
                                    res = (num > 1) ? num / 100 : num;
                                }
                            }
                            return isFinite(res) ? res : 0;
                        };

                        const win = parsePct(getValue(row, ['Win %', 'Win%', 'Win', 'Win Probability', 'Probabilidad Win', 'Probabilidad de Cierre', 'Probabilidad Ganar', 'Chance']))
                        const go = parsePct(getValue(row, ['Go %', 'Go%', 'Go', 'Go Probability', 'Probabilidad Go', 'Probabilidad de Ejecucion']))

                        const probabilityDecimal = Math.sqrt(Math.max(0, win * go))
                        const probability = probabilityDecimal * 100
                        const weightedAmount = amount * probabilityDecimal
                        const stage = getValue(row, ['Forecast Category', 'Stage', 'Etapa', 'Categoria']) || ''
                        let status = 'Active'
                        if (stage.toUpperCase().includes('WON')) status = 'Closed Won'
                        else if (stage.toUpperCase().includes('LOST')) status = 'Closed Lost'

                        const closeDateRaw = getValue(row, ['Close Date', 'Close Month', 'Fecha Cierre', 'Date'])
                        const closeDate = parseDate(closeDateRaw)
                        const accountId = findAccountId(channelName)
                        const piNumber = (getValue(row, ['PI Number', 'PI Name', 'PI']) || '').toString().trim()
                        const poNumber = (getValue(row, ['PO Number', 'PO', 'Orden Compra']) || '').toString().trim()

                        let id = ''
                        if (piNumber !== '') {
                            id = piNumber
                        } else {
                            const datePart = closeDate ? closeDate.substring(0, 7) : 'UNKNOWN'
                            id = `${name}-${datePart}-${amount}`.replace(/\s+/g, '_').toUpperCase()
                        }

                        const partialOpp: any = {
                            id, name, amount, probability, stage, po_number: poNumber, pi_number: piNumber, country: normalizeCountry(getValue(row, ['Installation Country', 'Country', 'Pais']) || '')
                        }

                        const alerts = analyzeOpportunityRisks(partialOpp) // Should return string[] now

                        return {
                            id: id,
                            name: name,
                            account_id: accountId,
                            amount: amount,
                            weighted_amount: weightedAmount,
                            alerts: alerts,
                            pi_number: piNumber,
                            po_number: poNumber,
                            probability: probability,
                            close_date: closeDate,
                            status: status,
                            stage: stage,
                            country: normalizeCountry(getValue(row, ['Installation Country', 'Country', 'Pais']) || ''),
                        }
                    })

                const uniqueOpportunitiesMap = new Map()
                opportunities.forEach(opp => {
                    uniqueOpportunitiesMap.set(opp.id, opp)
                })
                const uniqueOpportunities = Array.from(uniqueOpportunitiesMap.values())

                if (uniqueOpportunities.length > 0) {
                    duplicateCount = opportunities.length - uniqueOpportunities.length
                    const { error } = await supabase.from('opportunities').upsert(uniqueOpportunities, { onConflict: 'id' })
                    if (error) throw error
                    insertCount = uniqueOpportunities.length
                } else {
                    const firstRowKeys = data.length > 0 ? Object.keys(data[0]).join(', ') : 'Archivo vacío'
                    throw new Error(`No se encontraron registros válidos. Columnas detectadas: [${firstRowKeys}]. Se buscaba: 'Opportunity Name' o 'Name'.`)
                }
            } else if (uploadType === 'aop') {
                // Simplificando AOP para brevedad, usando logica original si es necesario
                // ... (AOP Logic same as before)
                // Reimplementing basics:
                const monthMap: Record<string, string> = {
                    'ENERO': '2025-01-01', 'JANUARY': '2025-01-01', 'ENE': '2025-01-01',
                    'FEBRERO': '2025-02-01', 'FEBRUARY': '2025-02-01', 'FEB': '2025-02-01',
                    'MARZO': '2025-03-01', 'MARCH': '2025-03-01', 'MAR': '2025-03-01',
                    'ABRIL': '2025-04-01', 'APRIL': '2025-04-01', 'ABR': '2025-04-01',
                    'MAYO': '2025-05-01', 'MAY': '2025-05-01',
                    'JUNIO': '2025-06-01', 'JUNE': '2025-06-01', 'JUN': '2025-06-01',
                    'JULIO': '2025-07-01', 'JULY': '2025-07-01', 'JUL': '2025-07-01',
                    'AGOSTO': '2025-08-01', 'AUGUST': '2025-08-01', 'AGO': '2025-08-01',
                    'SEPTIEMBRE': '2025-09-01', 'SEPTEMBER': '2025-09-01', 'SEP': '2025-09-01',
                    'OCTUBRE': '2025-10-01', 'OCTOBER': '2025-10-01', 'OCT': '2025-10-01',
                    'NOVIEMBRE': '2025-11-01', 'NOVEMBER': '2025-11-01', 'NOV': '2025-11-01',
                    'DICIEMBRE': '2025-12-01', 'DECEMBER': '2025-12-01', 'DIC': '2025-12-01',
                }
                const targets = data.filter(row => row.Mes || row.MES || row.Month).map(row => {
                    const mesRaw = (row.Mes || row.MES || row.Month || '').toString().toUpperCase().trim()
                    const targetRaw = row.AOP || row.aop || row.Target || 0
                    const date = monthMap[mesRaw]
                    if (!date) return null
                    let amount = parseRevenueAmount(targetRaw)
                    if (amount < 2000) amount = amount * 1000
                    return { month_period: date, target_amount: amount, country: 'General' }
                }).filter(t => t !== null)

                if (targets.length > 0) {
                    await supabase.from('aop_targets').delete().gt('target_amount', -1)
                    const { error } = await supabase.from('aop_targets').insert(targets)
                    if (error) throw error
                    insertCount = targets.length
                }
            } else if (uploadType === 'channel_targets') {
                // Channel Targets Logic
                const { data: accountsDb } = await supabase.from('accounts').select('id, name')
                const accountMap = new Map((accountsDb || []).map(a => [a.name.toUpperCase().trim(), a.id]))

                // Helper for fuzzy find (basic version, reusing logic or similar)
                const findAccountId = (channelName: string): string | null => {
                    if (!channelName) return null
                    const normalized = channelName.toUpperCase().trim()
                    if (accountMap.has(normalized)) return accountMap.get(normalized)!

                    // Simple partial match for fallback
                    const firstWord = normalized.split(' ')[0]
                    if (firstWord.length > 3) {
                        // Find whatever key contains this first word
                        const foundEntry = Array.from(accountMap.entries()).find(([k]) => k.includes(firstWord))
                        if (foundEntry) return foundEntry[1]
                    }
                    return null
                }

                const updates = []
                for (const row of data) {
                    const channelName = getValue(row, ['Channel', 'Canal', 'Cuenta', 'Account', 'Partner', 'Name', 'Nombre'])
                    const targetRaw = getValue(row, ['Target', 'Meta', 'Objetivo', 'Quota', 'Presupuesto'])

                    if (channelName && targetRaw !== undefined) {
                        const accountId = findAccountId(channelName)
                        const targetAmount = parseRevenueAmount(targetRaw)

                        if (accountId && targetAmount > 0) {
                            updates.push({ id: accountId, target: targetAmount })
                        }
                    }
                }

                if (updates.length > 0) {
                    const batchSize = 50
                    for (let i = 0; i < updates.length; i += batchSize) {
                        const chunk = updates.slice(i, i + batchSize)
                        await Promise.all(chunk.map(u =>
                            supabase.from('accounts').update({ target: u.target }).eq('id', u.id)
                        ))
                    }
                    insertCount = updates.length
                }
            } else {
                // Sales Logic
                const uniqueAccounts = new Map<string, { name: string; country: string }>()
                const uniqueProducts = new Map<string, { sku: string; category: string }>()

                const getProductCategory = (sku: string): string => {
                    const code = sku.toUpperCase().trim()
                    if (code.startsWith('20') || code.startsWith('40') || code.startsWith('IX')) return 'Lectoras de terceros'
                    if (code.startsWith('LNL-R') || code.startsWith('LNL-P')) return 'Reader BlueDiamond'
                    if (code.startsWith('LNL-M') || code.startsWith('LNL-13') || code.startsWith('LNL-X') || code.startsWith('LNL-11') || code.startsWith('LNL-12')) return 'Controladores OnGuard'
                    if (code.startsWith('LNL-4') || code.startsWith('LNL-6') || code.startsWith('LNL-AL') || code.startsWith('LNL-C')) return 'Fuentes'
                    if (code.startsWith('BD')) return 'Software BlueDiamond'
                    if (code.startsWith('IPC')) return 'Licencia de integracion con terceros'
                    if (code.startsWith('SW')) return 'Software de OnGuard'
                    if (code.startsWith('SUSP')) return 'Soporte y actualizacion'
                    if (code.startsWith('TR') || code.startsWith('LGE')) return 'Entrenamiento'
                    if (code.startsWith('S2')) return 'Hardware netbox o software netbox'
                    if (code.startsWith('ITR')) return 'Licencia de desarrollo para integrar'
                    if (code.startsWith('HV')) return 'Productos Hanwha'
                    if (code.startsWith('HC')) return 'Camaras Honeywell'
                    if (code.startsWith('ML')) return 'Producto Milestone'
                    if (code.startsWith('PES')) return 'Servicios de ingenieria'
                    if (!code || code === 'MISSING ITEM') return 'Otros Productos'
                    return 'Otros Productos'
                }

                const firstRow = data[0] || {}
                const revenueCol = Object.keys(firstRow).find(key => /revenue|amt|amount|monto|valor|total/i.test(key))
                const dateCol = Object.keys(firstRow).find(key => /calendar|date|fecha/i.test(key))
                const customerCol = Object.keys(firstRow).find(key => /customer.*name|customer_name|cliente/i.test(key))
                const itemCol = Object.keys(firstRow).find(key => /item.*nbr|part.*number|sku/i.test(key))
                const countryCol = Object.keys(firstRow).find(key => /country|pais/i.test(key))
                const accountNbrCol = Object.keys(firstRow).find(key => /account.*nbr/i.test(key))

                for (const row of data) {
                    const accountKey = (accountNbrCol ? row[accountNbrCol] : null) || (customerCol ? row[customerCol] : null)
                    const customerName = customerCol ? row[customerCol] : null
                    const country = normalizeCountry(countryCol ? row[countryCol] : 'PERU')

                    if (accountKey && customerName) {
                        uniqueAccounts.set(accountKey, { name: customerName, country })
                    }

                    if (itemCol) {
                        const sku = (row[itemCol] || '').toString().trim()
                        if (sku) {
                            const category = getProductCategory(sku)
                            uniqueProducts.set(sku, { sku, category })
                        }
                    }
                }

                const accountsToInsert = Array.from(uniqueAccounts.entries()).map(([_, acc]) => ({
                    name: acc.name,
                    country: acc.country,
                    status: 'Stable' as const,
                }))

                const { data: existingAccounts } = await supabase.from('accounts').select('id, name')
                const existingAccountNames = new Set(existingAccounts?.map(a => a.name) || [])
                const newAccounts = accountsToInsert.filter(a => !existingAccountNames.has(a.name))

                if (newAccounts.length > 0) {
                    await supabase.from('accounts').insert(newAccounts)
                }

                // Products
                const productsToUpsert = Array.from(uniqueProducts.values()).map(p => ({
                    category: p.category,
                    sub_category: p.sku,
                    base_price: 0
                }))

                const { data: existingProducts } = await supabase.from('products').select('id, sub_category')
                const existingProductSkus = new Set(existingProducts?.map(p => p.sub_category) || [])
                const newProducts = productsToUpsert.filter(p => !existingProductSkus.has(p.sub_category))

                if (newProducts.length > 0) {
                    await supabase.from('products').insert(newProducts)
                }

                const { data: allAccounts } = await supabase.from('accounts').select('id, name')
                const accountMap = new Map(allAccounts?.map(a => [a.name, a.id]) || [])

                const { data: allProducts } = await supabase.from('products').select('id, sub_category')
                const productMap = new Map(allProducts?.map(p => [p.sub_category, p.id]) || [])

                const sales = data
                    .map(row => {
                        const revenueValue = revenueCol ? row[revenueCol] : null
                        const revenue = parseRevenueAmount(revenueValue)
                        const customerName = customerCol ? row[customerCol] : null
                        const calendarDate = dateCol ? row[dateCol] : new Date().toISOString().split('T')[0]
                        const sku = itemCol ? (row[itemCol] || '').toString().trim() : null

                        return {
                            account_id: accountMap.get(customerName) || null,
                            product_id: productMap.get(sku) || null,
                            amount: revenue,
                            sale_date: parseDate(calendarDate),
                        }
                    })
                    .filter(s => s.amount > 0 && s.sale_date)

                if (sales.length > 0) {
                    const { error: deleteError } = await supabase.from('sales_records').delete().neq('id', '00000000-0000-0000-0000-000000000000') // Clear table logic (optional but implied from previous)
                    if (deleteError) console.error(deleteError) // Ignore error if empty

                    const batchSize = 100
                    for (let i = 0; i < sales.length; i += batchSize) {
                        const batch = sales.slice(i, i + batchSize)
                        const { error } = await supabase.from('sales_records').insert(batch)
                        if (error) throw error
                    }
                    insertCount = sales.length
                }
            }

            // Debug Warning
            let warnMsg = ''
            if (uploadType === 'opportunities' && insertCount > 0) {
                const sampleRow = parsedData[0]
                const sampleAmount = parseRevenueAmount(getValue(sampleRow, ['Amount', 'Monto', 'Total Amount', 'Revenue', 'Valor', 'Importe', 'Total', 'Precio', 'Ingresos', 'Monto Estimado']) || 0)
                if (sampleAmount === 0) {
                    warnMsg = ` | ALERTA: Monto $0 detectado. Usamos estas columnas: [${Object.keys(sampleRow).join(', ')}]`
                }
            }

            setResult({
                success: true,
                message: `Se importaron ${insertCount} registros` +
                    (duplicateCount > 0 ? ` (${duplicateCount} omitidos)` : '') + warnMsg,
                count: insertCount,
            })

            if (!warnMsg) {
                setTimeout(() => {
                    router.push('/summary')
                    router.refresh()
                }, 2000)
            }
        } catch (error: any) {
            setResult({ success: false, message: error.message || 'Error al subir datos' })
        } finally {
            setUploading(false)
        }
    }

    const clearFile = () => {
        setFile(null)
        setPreview([])
        setColumns([])
        setResult(null)
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Upload className="h-8 w-8 text-indigo-400" />
                    Cargar Datos
                </h1>
                <p className="text-slate-400 mt-1">
                    Importa oportunidades y registros de ventas (Excel/CSV)
                </p>
            </div>

            {/* Upload Type Selection */}
            <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Tipo de Datos</h3>
                <div className="flex gap-4">
                    <button onClick={() => setUploadType('opportunities')} className={`flex-1 p-4 rounded-xl border-2 transition-all ${uploadType === 'opportunities' ? 'border-indigo-500 bg-indigo-500/20' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}>
                        <h4 className="font-semibold text-white">Oportunidades</h4>
                    </button>
                    <button onClick={() => setUploadType('sales')} className={`flex-1 p-4 rounded-xl border-2 transition-all ${uploadType === 'sales' ? 'border-indigo-500 bg-indigo-500/20' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}>
                        <h4 className="font-semibold text-white">Ventas</h4>
                    </button>
                    <button onClick={() => setUploadType('aop')} className={`flex-1 p-4 rounded-xl border-2 transition-all ${uploadType === 'aop' ? 'border-indigo-500 bg-indigo-500/20' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}>
                        <h4 className="font-semibold text-white">Metas AOP</h4>
                    </button>
                    <button onClick={() => setUploadType('channel_targets')} className={`flex-1 p-4 rounded-xl border-2 transition-all ${uploadType === 'channel_targets' ? 'border-indigo-500 bg-indigo-500/20' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}>
                        <h4 className="font-semibold text-white">Metas Canales</h4>
                    </button>
                </div>
            </div>

            {/* Drop Zone */}
            <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`backdrop-blur-xl bg-slate-900/80 border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${file ? 'border-indigo-500' : 'border-slate-700 hover:border-slate-600'}`}
            >
                {!file ? (
                    <>
                        <FileSpreadsheet className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">Arrastra tu archivo aquí</h3>
                        <label className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl cursor-pointer mt-4">
                            <Upload className="h-5 w-5" />
                            Seleccionar Archivo
                            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
                        </label>
                    </>
                ) : (
                    <div className="flex items-center justify-between">
                        <div className="text-left">
                            <p className="text-white font-semibold">{file.name}</p>
                            <p className="text-slate-400 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button onClick={clearFile} className="p-2 hover:bg-slate-800 rounded-lg"><X className="h-5 w-5 text-slate-400" /></button>
                    </div>
                )}
            </div>

            {/* Preview Table */}
            {preview.length > 0 && (
                <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6 overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                            <tr>{columns.map(c => <th key={c} className="px-4 py-3">{c}</th>)}</tr>
                        </thead>
                        <tbody>
                            {preview.map((row, i) => (
                                <tr key={i} className="border-b border-slate-700">
                                    {columns.map(c => <td key={c} className="px-4 py-3">{row[c]}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Result Message */}
            {result && (
                <div className={`backdrop-blur-xl border rounded-2xl p-6 flex items-center gap-4 ${result.success ? 'bg-emerald-900/20 border-emerald-800/50' : 'bg-red-900/20 border-red-800/50'}`}>
                    {result.success ? <CheckCircle className="h-6 w-6 text-emerald-400" /> : <AlertCircle className="h-6 w-6 text-red-400" />}
                    <p className={result.success ? 'text-emerald-400' : 'text-red-400'}>{result.message}</p>
                </div>
            )}

            {/* Upload Button */}
            {file && !result?.success && (
                <button onClick={handleUpload} disabled={uploading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold mt-4 disabled:opacity-50">
                    {uploading ? 'Importando...' : 'Iniciar Importación'}
                </button>
            )}
        </div>
    )
}
