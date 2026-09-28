'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import React from 'react'

export default function FornecedorContratosPage() {
  const [contratos, setContratos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  
  const [qtdAbater, setQtdAbater] = useState('')
  const [nfFile, setNfFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  const loadContratos = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('propostas')
      .select(`
        *,
        demandas!inner(titulo, status),
        contrato_abatimentos(id, quantidade, nf_url, created_at, status_nf, recusa_url)
      `)
      .eq('fornecedor_id', user.id)
      .eq('vencedora', true)
      .eq('status_contrato', 'ATIVO')
      .eq('demandas.status', 'CONCLUIDA')
      .order('created_at', { ascending: false })

    data?.forEach(c => {
      if (c.contrato_abatimentos) {
        c.contrato_abatimentos.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      }
    })
    setContratos(data || [])
    setLoading(false)
  }

  useEffect(() => { loadContratos() }, [])

  const handleQtdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9,]/g, '')
    const parts = value.split(',')
    let integerPart = parts[0]
    if (integerPart) integerPart = integerPart.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    setQtdAbater(parts.length > 1 ? `${integerPart},${parts[1]}` : integerPart)
  }

  const handleStop = async (id: string) => {
    if (!confirm('Atenção: Ao pausar, este contrato sairá da sua lista. Confirma?')) return
    try {
      await fetch('/api/fornecedor/contratos/pausar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propostaId: id })
      })
      await loadContratos()
      router.refresh()
    } catch (err) {}
  }

  const handleAbater = async (e: React.FormEvent, propostaId: string) => {
    e.preventDefault()
    if (!nfFile) { alert('A Nota Fiscal é obrigatória.'); return }
    const qtdLimpa = qtdAbater.replace(/\./g, '').replace(',', '.')
    const qtdNumerica = Number(qtdLimpa)
    if (isNaN(qtdNumerica) || qtdNumerica <= 0) { alert('Informe uma quantidade válida.'); return }
    
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const fileExt = nfFile.name.split('.').pop()
      const filePath = `${user?.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('notas-fiscais').upload(filePath, nfFile, { upsert: false })
      if (uploadError) throw new Error('Erro no envio da Nota Fiscal')

      const { data: urlData } = supabase.storage.from('notas-fiscais').getPublicUrl(filePath)

      const res = await fetch('/api/contratos/abater', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propostaId, quantidadeAAbater: qtdNumerica, nfUrl: urlData.publicUrl })
      })
      if (!res.ok) throw new Error((await res.json()).error)

      alert('NF enviada com sucesso!')
      setQtdAbater(''); setNfFile(null)
      await loadContratos()
    } catch (err: any) { alert(err.message) } 
    finally { setSubmitting(false) }
  }

  const toggleRow = (id: string) => setExpandedRow(expandedRow === id ? null : id)

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Carregando contratos...</div>

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed relative p-4 md:p-8" style={{ backgroundImage: "url('https://fortgreen.com.br/public/images/og-img/dc0323873922ee19b3cde9102758845d.jpg')" }}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" />
      <div className="relative z-10 max-w-[98%] mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white drop-shadow-md">Meus Contratos Ativos</h1>
          <p className="text-sm text-gray-200">Acompanhe faturamentos e NFs enviadas</p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead className="bg-green-50/80 border-b text-[11px] uppercase text-gray-600 tracking-tight">
                <tr>
                  <th className="w-10 text-center px-2"></th>
                  <th className="px-4 py-3">Cotação / Item</th>
                  <th className="px-4 py-3 text-center">Entrega</th>
                  <th className="px-4 py-3 text-center">Saldo Pendente</th>
                  <th className="px-4 py-3 font-bold text-green-800">Seu Valor Acordado</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/60 text-sm">
                {contratos.map((c) => (
                  <React.Fragment key={c.id}>
                    <tr className="hover:bg-gray-50/80 transition cursor-pointer" onClick={() => toggleRow(c.id)}>
                      <td className="px-2 text-center text-gray-400 font-bold">{expandedRow === c.id ? '▼' : '▶'}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{c.demandas?.titulo}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{c.data_entrega ? new Date(c.data_entrega).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className="px-4 py-3 text-center font-bold text-blue-700 bg-blue-50/50">
                        {c.quantidade_disponivel ? Number(c.quantidade_disponivel).toLocaleString('pt-BR') : '0'}
                      </td>
                      <td className="px-4 py-3 font-bold text-green-700">
                        {c.moeda === 'USD' ? 'US$ ' : 'R$ '}{Number(c.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={(e) => { e.stopPropagation(); handleStop(c.id); }} className="px-3 py-1 text-[10px] font-bold rounded bg-red-600 hover:bg-red-700 text-white shadow-sm uppercase tracking-wider">
                          Pausar / STOP
                        </button>
                      </td>
                    </tr>

                    {expandedRow === c.id && (
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <td colSpan={6} className="p-6">
                          <div className="flex flex-col md:flex-row gap-8">
                            
                            <div className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-fit">
                              <h4 className="font-semibold text-gray-800 mb-4 text-sm">Enviar Nota Fiscal</h4>
                              <form onSubmit={(e) => handleAbater(e, c.id)} className="space-y-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Qtd Faturada (Descontar do Saldo)</label>
                                  <input type="text" inputMode="decimal" required value={qtdAbater} onChange={handleQtdChange} className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-green-500 outline-none" placeholder="Ex: 5.000" />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Anexar PDF da NF</label>
                                  <input type="file" accept=".pdf" required onChange={(e) => setNfFile(e.target.files?.[0] || null)} className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer" />
                                </div>
                                <button type="submit" disabled={submitting || Number(c.quantidade_disponivel) <= 0} className="w-full py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition">
                                  {submitting ? 'A enviar...' : 'Enviar Nota Fiscal'}
                                </button>
                              </form>
                            </div>

                            <div className="flex-[1.5]">
                              <h4 className="font-semibold text-gray-800 mb-4 text-sm">Histórico e Status</h4>
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                {c.contrato_abatimentos?.length === 0 && <p className="text-xs text-gray-500 italic">Nenhum faturamento registado.</p>}
                                {c.contrato_abatimentos?.map((abatimento: any) => (
                                  <div key={abatimento.id} className={`p-3 rounded-lg shadow-sm border flex justify-between items-center ${abatimento.status_nf === 'RECUSADA' ? 'bg-red-50/50 border-red-200' : 'bg-white border-gray-200'}`}>
                                    <div>
                                      <p className={`text-sm font-bold ${abatimento.status_nf === 'RECUSADA' ? 'text-red-700 line-through' : 'text-gray-900'}`}>
                                        {Number(abatimento.quantidade) < 0 ? '+' : '-'} {Math.abs(Number(abatimento.quantidade)).toLocaleString('pt-BR')} un
                                      </p>
                                      <p className="text-[10px] text-gray-500 mt-0.5">{new Date(abatimento.created_at).toLocaleString('pt-BR')}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                      {abatimento.status_nf === 'RECUSADA' && (
                                        <>
                                          <span className="text-[10px] font-bold text-red-700">NF RECUSADA PELA FORTGREEN</span>
                                          {abatimento.recusa_url && (
                                            <a href={abatimento.recusa_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold bg-red-100 text-red-800 px-2 py-1 rounded border border-red-200 hover:bg-red-200">
                                              📌 Ver Motivo / Anexo da Recusa
                                            </a>
                                          )}
                                        </>
                                      )}
                                      {abatimento.nf_url && (
                                        <a href={abatimento.nf_url} target="_blank" className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100">
                                          Ver Anexo Enviado
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}