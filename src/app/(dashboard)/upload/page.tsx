'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from 'lucide-react'
import * as XLSX from 'xlsx'

interface UploadResult {
    success: boolean
    message: string
    count?: number
}

export default function UploadPage() {
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<any[]>([])
    const [columns, setColumns] = useState<string[]>([])
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState<UploadResult | null>(null)
    const [uploadType, setUploadType] = useState<'opportunities' | 'sales' | 'aop'>('opportunities')
    const [parsedData, setParsedData] = useState<any[]>([])

    const router = useRouter()
    const supabase = createClient()

    // Función para parsear archivos (CSV o XLSX)
    const parseFile = async (selectedFile: File): Promise<{ data: any[]; columns: string[] }> => {
        const fileName = selectedFile.name.toLowerCase()

        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            // Parsear Excel con SheetJS (con conversión de fechas)
            return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = (e) => {
                    try {
                        const data = e.target?.result
                        // Usar cellDates para convertir fechas de Excel automáticamente
                        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
                        const sheetName = workbook.SheetNames[0]
                        const worksheet = workbook.Sheets[sheetName]
                        // raw: false formatea las fechas, dateNF especifica el formato
                        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                            defval: '',
                            raw: false,
                            dateNF: 'yyyy-mm-dd'
                        })
                        const cols = jsonData.length > 0 ? Object.keys(jsonData[0] as object) : []
                        resolve({ data: jsonData, columns: cols })
                    } catch (err) {
                        reject(err)
                    }
                }
                reader.onerror = reject
                reader.readAsArrayBuffer(selectedFile)
            })
        } else {
            // Parsear CSV con parsing manual
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

            if (uploadType === 'opportunities') {
                // Mapear columnas CSV a estructura de oportunidades
                const opportunities = data
                    .filter(row => row.name && row.total_amount)
                    .map(row => ({
                        name: row.name || row.nombre || row.Name,
                        account_id: row.account_id || null,
                        total_amount: parseFloat(row.total_amount || row.monto || row.amount || 0),
                        probability: parseFloat(row.probability || row.probabilidad || 50),
                        close_date: row.close_date || row.fecha_cierre || new Date().toISOString().split('T')[0],
                        status: row.status || 'Active',
                        risk_tags: [],
                    }))

                if (opportunities.length > 0) {
                    const { error } = await supabase.from('opportunities').insert(opportunities)
                    if (error) throw error
                    insertCount = opportunities.length
                }
            } else if (uploadType === 'aop') {
                // Lógica para cargar Metas AOP
                // Formato esperado: Mes, AOP (Ej: ENERO, 65)
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

                const targets = data
                    .filter(row => row.Mes || row.MES || row.Month)
                    .map(row => {
                        const mesRaw = (row.Mes || row.MES || row.Month || '').toString().toUpperCase().trim()
                        const targetRaw = row.AOP || row.aop || row.Target || 0

                        const date = monthMap[mesRaw]
                        if (!date) return null

                        // El AOP en el excel viene en miles (ej: 65 = 65,000) o absoluto?
                        // Asumiremos que si es < 1000 son miles, si es > 1000 es absoluto, 
                        // O mejor, multiplicamos por 1000 si el usuario lo pide. 
                        // Viendo la imagen: 65, 72. En el gráfico meta es ~80k.
                        // Entonces 65 significa 65,000.

                        let amount = parseRevenueAmount(targetRaw)
                        if (amount < 2000) amount = amount * 1000 // Heurística: si es pequeño, son miles

                        return {
                            month_period: date,
                            target_amount: amount,
                            country: 'General' // Default
                        }
                    })
                    .filter(t => t !== null)

                if (targets.length > 0) {
                    // Limpiar targets anteriores? O upsert? Mejor limpiar para evitar duplicados del mismo mes
                    // Pero cuidado de no borrar de otros años si los hubiera.
                    // Por simplicidad, borraremos AOP de 2025 y reinsertaremos.

                    // Upsert basado en month_period (pero necesitamos constraint único)
                    // Mejor Delete e Insert
                    await supabase.from('aop_targets').delete().gt('target_amount', -1) // Borrar todo por ahora

                    const { error } = await supabase.from('aop_targets').insert(targets)
                    if (error) throw error
                    insertCount = targets.length
                }

            } else {
                // Mapear formato de ventas reales (Excel GE)
                // Columnas esperadas: Calendar Date, Customer Account Nbr, Customer Name, 
                // Country Name, Region, GE Order Nbr, Customer PO Nbr, Item Nbr, Revenue - Reporting Currency Amt

                // Primero, obtener/crear cuentas únicas
                const uniqueAccounts = new Map<string, { name: string; country: string }>()

                for (const row of data) {
                    const accountKey = row['Customer Account Nbr'] || row['Customer Name']
                    const customerName = row['Customer Name'] || row['customer_name']
                    const country = normalizeCountry(row['Country Name'] || row['country'] || row['Country'])

                    if (accountKey && customerName && country) {
                        uniqueAccounts.set(accountKey, { name: customerName, country })
                    }
                }

                // Insertar cuentas nuevas
                const accountsToInsert = Array.from(uniqueAccounts.entries()).map(([_, acc]) => ({
                    name: acc.name,
                    country: acc.country,
                    status: 'Stable' as const,
                }))

                // Verificar si las cuentas ya existen
                const { data: existingAccounts } = await supabase
                    .from('accounts')
                    .select('id, name')

                const existingAccountNames = new Set(existingAccounts?.map(a => a.name) || [])
                const newAccounts = accountsToInsert.filter(a => !existingAccountNames.has(a.name))

                if (newAccounts.length > 0) {
                    await supabase.from('accounts').insert(newAccounts)
                }

                // Obtener todos los IDs de cuentas
                const { data: allAccounts } = await supabase
                    .from('accounts')
                    .select('id, name')

                const accountMap = new Map(allAccounts?.map(a => [a.name, a.id]) || [])

                // Procesar ventas - buscar columna de revenue dinámicamente
                const firstRow = data[0] || {}
                const revenueCol = Object.keys(firstRow).find(key =>
                    key.toLowerCase().includes('revenue') ||
                    key.toLowerCase().includes('amt') ||
                    key.toLowerCase().includes('amount') ||
                    key.toLowerCase().includes('monto')
                )
                const dateCol = Object.keys(firstRow).find(key =>
                    key.toLowerCase().includes('calendar') ||
                    key.toLowerCase().includes('date') ||
                    key.toLowerCase().includes('fecha')
                )
                const customerCol = Object.keys(firstRow).find(key =>
                    key.toLowerCase().includes('customer name') ||
                    key.toLowerCase().includes('customer_name') ||
                    key.toLowerCase().includes('cliente')
                )

                console.log('Columnas detectadas:', { revenueCol, dateCol, customerCol })
                console.log('Primera fila:', firstRow)
                console.log('Total filas en archivo:', data.length)

                // Contar registros con diferentes estados
                let validCount = 0
                let zeroRevenueCount = 0
                let invalidRevenueCount = 0

                const sales = data
                    .map(row => {
                        const revenueValue = revenueCol ? row[revenueCol] : null
                        const revenue = parseRevenueAmount(revenueValue)
                        const customerName = customerCol ? row[customerCol] : null
                        const calendarDate = dateCol ? row[dateCol] : new Date().toISOString().split('T')[0]

                        // Logging para debugging
                        if (revenue === 0 && revenueValue) {
                            if (zeroRevenueCount < 5) {
                                console.log('Valor con revenue=0:', revenueValue, '-> parseado:', revenue)
                            }
                            zeroRevenueCount++
                        } else if (revenue > 0) {
                            validCount++
                        } else {
                            invalidRevenueCount++
                        }

                        return {
                            account_id: accountMap.get(customerName) || null,
                            product_id: null,
                            amount: revenue, // Incluir todos, incluso con revenue=0
                            sale_date: parseDate(calendarDate),
                        }
                    })
                    .filter(s => s.sale_date) // Solo filtrar si no tiene fecha válida

                console.log(`Estadísticas: ${validCount} con revenue>0, ${zeroRevenueCount} con revenue=0, ${invalidRevenueCount} inválidos`)
                console.log(`Ventas a insertar: ${sales.length} de ${data.length} filas`)

                if (sales.length > 0) {
                    // Limpiar tabla antes de insertar para evitar duplicados
                    const { error: deleteError } = await supabase.from('sales_records').delete().neq('id', '00000000-0000-0000-0000-000000000000') // Borrar todo
                    if (deleteError) console.error('Error limpiando tabla:', deleteError)

                    // Insertar en lotes de 100
                    const batchSize = 100
                    for (let i = 0; i < sales.length; i += batchSize) {
                        const batch = sales.slice(i, i + batchSize)
                        const { error } = await supabase.from('sales_records').insert(batch)
                        if (error) throw error
                    }
                    insertCount = sales.length
                }
            }

            setResult({
                success: true,
                message: `Se importaron exitosamente ${insertCount} registros`,
                count: insertCount,
            })

            // Limpiar después de éxito
            setTimeout(() => {
                router.push('/summary')
                router.refresh()
            }, 2000)
        } catch (error: any) {
            setResult({ success: false, message: error.message || 'Error al subir datos' })
        } finally {
            setUploading(false)
        }
    }

    // Función para normalizar país
    const normalizeCountry = (country: string): string => {
        const normalized = country?.toUpperCase().trim()
        if (normalized?.includes('PERU') || normalized?.includes('PERÚ')) return 'PERU'
        if (normalized?.includes('COLOMBIA')) return 'COLOMBIA'
        if (normalized?.includes('ECUADOR')) return 'ECUADOR'
        return 'PERU' // Default
    }

    // Función para parsear montos (maneja formato europeo: 1.372,00 = 1372.00)
    const parseRevenueAmount = (value: string | number): number => {
        if (typeof value === 'number') return value
        if (!value) return 0

        const strValue = value.toString().trim()

        // Detectar si es negativo por paréntesis: (1.23) o (1,23)
        const isNegativeParenthesis = strValue.startsWith('(') && strValue.endsWith(')')
        // Detectar si es negativo por signo menos (asegurando que no sea guión de fecha si llega a pasar)
        const isNegativeSign = strValue.includes('-') && !Number.isNaN(parseFloat(strValue))

        let localStr = strValue
        if (isNegativeParenthesis) {
            localStr = strValue.slice(1, -1).trim()
        }

        // Detectar formato europeo vs americano sobre la cadena limpia de paréntesis
        // Europeo: 1.372,00 (punto = miles, coma = decimal)
        // Americano: 1,372.00 (coma = miles, punto = decimal)

        // Si tiene coma seguida de exactamente 2 dígitos al final, es formato europeo
        const isEuropeanFormat = /,\d{2}$/.test(localStr) ||
            (localStr.includes(',') && !localStr.includes('.')) ||
            (localStr.indexOf('.') < localStr.lastIndexOf(','))

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
        // Si tenía paréntesis O signo menos, y el resultado es positivo, lo volvemos negativo
        // (Evitamos doble negación si parseFloat ya devolvió negativo)
        if ((isNegativeParenthesis || isNegativeSign) && result > 0) {
            result = result * -1
        }

        // Log para detectar si estamos convirtiendo mal (ej: 1200 -> 120000)
        if (Math.abs(result) > 100000) {
            console.warn(`ALERTA: Valor alto detectado: Original '${value}' -> Result ${result}`)
        }

        if (result < 0) {
            console.log(`INFO: Valor NEGATIVO detectado: Original '${value}' -> Result ${result}`)
        }

        return result
    }

    // Función para parsear fechas (Excel serial, Date object, varios formatos string)
    const parseDate = (dateValue: string | number | Date): string => {
        if (!dateValue) return new Date().toISOString().split('T')[0]

        // Si es un objeto Date
        if (dateValue instanceof Date) {
            return dateValue.toISOString().split('T')[0]
        }

        // Si es un número serial de Excel (días desde 1900-01-01)
        if (typeof dateValue === 'number') {
            const excelEpoch = new Date(1899, 11, 30)
            const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000)
            return date.toISOString().split('T')[0]
        }

        const dateStr = String(dateValue).trim()

        // Si ya está en formato ISO (yyyy-mm-dd)
        if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            return dateStr.substring(0, 10)
        }

        // Formato con slash: detectar si es M/D/YY, M/D/YYYY, D/M/YY, D/M/YYYY
        const slashParts = dateStr.split('/')
        if (slashParts.length === 3) {
            const parts = slashParts.map(p => parseInt(p, 10))
            const first = parts[0]
            const second = parts[1]
            let third = parts[2]

            // Expandir año de 2 dígitos a 4 dígitos
            if (third < 100) {
                third = third < 50 ? 2000 + third : 1900 + third
            }

            // Determinar formato basándose en los valores
            // Si el primer número > 12, es día (formato dd/mm/yyyy)
            // Si el segundo número > 12, es día (formato mm/dd/yyyy - US)
            // Si ambos <= 12, asumimos formato US (mm/dd/yyyy) porque el Excel lo muestra así

            let day: number, month: number, year: number

            if (first > 12) {
                // dd/mm/yyyy
                day = first
                month = second
                year = third
            } else if (second > 12) {
                // mm/dd/yyyy (US format)
                month = first
                day = second
                year = third
            } else {
                // Ambos <= 12, asumimos formato US (mm/dd/yyyy) basado en el Excel mostrado
                month = first
                day = second
                year = third
            }

            // Validar la fecha
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900) {
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            }
        }

        // Retornar fecha actual si no se pudo parsear
        console.warn('No se pudo parsear fecha:', dateStr)
        return new Date().toISOString().split('T')[0]
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
                    Importa oportunidades y registros de ventas desde archivos CSV
                </p>
            </div>

            {/* Upload Type Selection */}
            <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Tipo de Datos</h3>
                <div className="flex gap-4">
                    <button
                        onClick={() => setUploadType('opportunities')}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${uploadType === 'opportunities'
                            ? 'border-indigo-500 bg-indigo-500/20'
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                            }`}
                    >
                        <h4 className={`font-semibold ${uploadType === 'opportunities' ? 'text-indigo-400' : 'text-white'}`}>
                            Oportunidades
                        </h4>
                        <p className="text-slate-400 text-sm mt-1">
                            Pipeline de ventas y forecast
                        </p>
                    </button>

                    <button
                        onClick={() => setUploadType('sales')}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${uploadType === 'sales'
                            ? 'border-indigo-500 bg-indigo-500/20'
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                            }`}
                    >
                        <h4 className={`font-semibold ${uploadType === 'sales' ? 'text-indigo-400' : 'text-white'}`}>
                            Ventas
                        </h4>
                        <p className="text-slate-400 text-sm mt-1">
                            Registros de ventas reales
                        </p>
                    </button>

                    <button
                        onClick={() => setUploadType('aop')}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${uploadType === 'aop'
                            ? 'border-indigo-500 bg-indigo-500/20'
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                            }`}
                    >
                        <h4 className={`font-semibold ${uploadType === 'aop' ? 'text-indigo-400' : 'text-white'}`}>
                            Metas AOP
                        </h4>
                        <p className="text-slate-400 text-sm mt-1">
                            Metas mensuales por país
                        </p>
                    </button>
                </div>
            </div>

            {/* Drop Zone */}
            <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`backdrop-blur-xl bg-slate-900/80 border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${file ? 'border-indigo-500' : 'border-slate-700 hover:border-slate-600'
                    }`}
            >
                {!file ? (
                    <>
                        <FileSpreadsheet className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">
                            Arrastra tu archivo CSV aquí
                        </h3>
                        <p className="text-slate-400 mb-4">o haz clic para seleccionar</p>
                        <label className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl cursor-pointer transition-colors">
                            <Upload className="h-5 w-5" />
                            Seleccionar Archivo
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                    </>
                ) : (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <FileSpreadsheet className="h-12 w-12 text-indigo-400" />
                            <div className="text-left">
                                <p className="text-white font-semibold">{file.name}</p>
                                <p className="text-slate-400 text-sm">
                                    {(file.size / 1024).toFixed(1)} KB • {preview.length} filas de vista previa
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={clearFile}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>
                )}
            </div>

            {/* Preview */}
            {preview.length > 0 && (
                <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6 overflow-hidden">
                    <h3 className="text-lg font-semibold text-white mb-4">Vista Previa</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    {columns.map((col) => (
                                        <th key={col} className="text-left py-3 px-4 text-slate-400 text-sm font-medium">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map((row, idx) => (
                                    <tr key={idx} className="border-b border-slate-800">
                                        {columns.map((col) => (
                                            <td key={col} className="py-3 px-4 text-slate-300 text-sm">
                                                {row[col] || '-'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Result */}
            {result && (
                <div
                    className={`backdrop-blur-xl border rounded-2xl p-6 flex items-center gap-4 ${result.success
                        ? 'bg-emerald-900/20 border-emerald-800/50'
                        : 'bg-red-900/20 border-red-800/50'
                        }`}
                >
                    {result.success ? (
                        <CheckCircle className="h-6 w-6 text-emerald-400 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
                    )}
                    <p className={result.success ? 'text-emerald-400' : 'text-red-400'}>
                        {result.message}
                    </p>
                </div>
            )}

            {/* Upload Button */}
            {file && !result?.success && (
                <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploading ? (
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <Upload className="h-5 w-5" />
                            Importar {uploadType === 'opportunities' ? 'Oportunidades' : 'Ventas'}
                        </>
                    )}
                </button>
            )}

            {/* Expected Format */}
            <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Formato Esperado</h3>

                {uploadType === 'opportunities' ? (
                    <div className="bg-slate-800/50 rounded-xl p-4">
                        <code className="text-sm text-slate-300">
                            name,total_amount,probability,close_date,status<br />
                            "Proyecto Alpha",85000,75,2026-02-15,Active<br />
                            "Contrato Beta",120000,45,2026-03-20,Active
                        </code>
                    </div>
                ) : uploadType === 'sales' ? (
                    <div className="bg-slate-800/50 rounded-xl p-4 overflow-x-auto">
                        <code className="text-sm text-slate-300 whitespace-nowrap">
                            Calendar Date,Customer Account Nbr,Customer Name,Country Name,Region,GE Order Nbr,Item Nbr,Revenue - Reporting Currency Amt<br />
                            21/01/2025,1795637,Prosegur Tecnologia Peru SA,Peru,CSAR,5914604,Missing Item,13.27<br />
                            27/02/2025,1795637,Prosegur Tecnologia Peru SA,Peru,CSAR,5929565,40TKS-02-0045FA,1.372,00
                        </code>
                        <p className="text-slate-500 text-xs mt-3">
                            El sistema auto-crea cuentas desde Customer Name y Country Name
                        </p>
                    </div>
                ) : (
                    <div className="bg-slate-800/50 rounded-xl p-4">
                        <code className="text-sm text-slate-300">
                            Mes,AOP<br />
                            ENERO,65<br />
                            FEBRERO,72<br />
                            MARZO,108
                        </code>
                        <p className="text-slate-500 text-xs mt-3">
                            Los valores &lt; 1000 se multiplicarán x1000 automáticamente
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
