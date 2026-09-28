export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (!data || data.length === 0) {
    alert('Não há dados disponíveis para exportar.')
    return
  }

  const headers = Object.keys(data[0])
  const csvRows: string[] = []

  // Títulos das colunas
  csvRows.push(headers.join(';'))

  // Linhas de dados
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] === null || row[header] === undefined ? '' : row[header]
      // Trata aspas duplas e quebras de linha
      const escaped = ('' + val).replace(/"/g, '""')
      return `"${escaped}"`
    })
    csvRows.push(values.join(';'))
  }

  // BOM (\uFEFF) para forçar o Excel a reconhecer caracteres UTF-8 (acentos e ç)
  const csvContent = '\uFEFF' + csvRows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0,10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}