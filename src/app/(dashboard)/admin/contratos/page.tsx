'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import React from 'react'

export default function AdminContratosPage() {
  const [propostas, setPropostas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  
  const [qtdAbater, setQtdAbater] = useState('')
  const [tipoAcao, setTipoAcao] = useState<'DESCONTAR' | 'ACRESCENTAR'>('DESCONTAR')
  const [submitting, setSubmitting] = useState(false)
  
  const [recusaModalOpen, setRecusaModalOpen] = useState(false)
  const [selectedAbatimentoId, setSelectedAbatimentoId] = useState<string | null>(null)
  const [recusaFile, setRecusaFile] = useState<File | null>(null)
  const [recusando, setRecusando] = useState(false)

  const supabase = createClient()

  const loadData = async () => {
    const { data } = await supabase
      .from('propostas')
      .select(`
        *,
        demandas!inner(id, titulo, status),
        profiles:fornecedor_id(nome_empresa),
        contrato_abatimentos(id, quantidade, nf_url, created_at, status_nf, recusa_url)
      `)
      .eq('vencedora', true)
      .eq('status_contrato', 'ATIVO')
      .eq('demandas.status', 'CONCLUIDA')
      .order('created_at', { ascending: false })

    data?.forEach(c => {
      if (c.contrato_abatimentos) {
        c.contrato_abatimentos.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      }
    })
    setPropostas(data || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleQtdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9,]/g, '')
    const parts = value.split(',')
    let integerPart = parts[0]
    if (integerPart) integerPart = integerPart.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    setQtdAbater(parts.length > 1 ? `${integerPart},${parts[1]}` : integerPart)
  }

  const handlePausarAdmin = async (propostaId: string) => {
    if (!confirm('Atenção: Ao pausar este contrato, ele sairá da lista de ativos para você e para o fornecedor, indo para Finalizados. Confirms?')) return
    try {
      const res = await fetch('/api/admin/contratos/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propostaId, statusContrato: 'PAUSADO' })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Erro ao pausar contrato')
    }
  }

  const handleAbater = async (e: React.FormEvent, propostaId: string) => {
    e.preventDefault()
    const qtdLimpa = qtdAbater.replace(/\./g, '').replace(',', '.')
    const qtdNumerica = Number(qtdLimpa)
    if (isNaN(qtdNumerica) || qtdNumerica <= 0) { alert('Informe uma quantidade válida.'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/contratos/abater', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propostaId, quantidadeAAbater: qtdNumerica, nfUrl: null, acao: tipoAcao }) 
      })
      if (!res.ok) throw new Error((await res.json()).error)
      alert('Ajuste Manual realizado com sucesso!')
      setQtdAbater('')
      await loadData()
    } catch (err: any) { alert(err.message) } 
    finally { setSubmitting(false) }
  }

  const openRecusaModal = (id: string) => {
    setSelectedAbatimentoId(id)
    setRecusaFile(null)
    setRecusaModalOpen(true)
  }

  const handleConfirmRecusa = async () => {
    if (!selectedAbatimentoId) return
    setRecusando(true)

    try {
      let recusaUrl = null
      if (recusaFile) {
        const { data: { user } } = await supabase.auth.getUser()
        const fileExt = recusaFile.name.split('.').pop()
        const filePath = `recusas/${user?.id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage.from('notas-fiscais').upload(filePath, recusaFile, { upsert: false })
        if (uploadError) throw new Error('Erro ao salvar anexo de recusa.')

        const { data: urlData } = supabase.storage.from('notas-fiscais').getPublicUrl(filePath)
        recusaUrl = urlData.publicUrl
      }

      const res = await fetch('/api/contratos/acao-nf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abatimentoId: selectedAbatimentoId, acao: 'RECUSAR', recusaUrl }) 
      })

      if (!res.ok) throw new Error((await res.json()).error)
      setRecusaModalOpen(false)
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Erro ao recusar NF')
    } finally {
      setRecusando(false)
    }
  }

  const toggleRow = async (id: string, pendentes: number) => {
    if (expandedRow !== id) {
      setExpandedRow(id)
      if (pendentes > 0) {
        await fetch('/api/contratos/acao-nf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propostaId: id, acao: 'VER_TODAS' }) 
        })
        loadData()
      }
    } else {
      setExpandedRow(null)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Carregando...</div>

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed relative p-4 md:p-8" style={{ backgroundImage: "url('https://fortgreen.com.br/public/images/og-img/dc0323873922ee19b3cde9102758845d.jpg')" }}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" />
      <div className="relative z-10 max-w-[98%] mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white drop-shadow-md">Contratos Ativos</h1>
          <p className="text-sm text-gray-200">Acompanhamento e aprovação de faturamentos</p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead className="bg-gray-100/80 border-b text-[11px] uppercase text-gray-600 tracking-tight">
                <tr>
                  <th className="w-10 text-center px-2"></th>
                  <th className="px-4 py-3">Fornecedor</th>
                  <th className="px-4 py-3">Produto / Cotação</th>
                  <th className="px-4 py-3 text-center">Saldo Restante</th>
                  <th className="px-4 py-3">Valor Total</th>
                  <th className="px-4 py-3 text-center">NFs Recebidas</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/60 text-sm">
                {propostas?.map((p: any) => {
                  const nfsPendentes = p.contrato_abatimentos?.filter((a:any) => a.status_nf === 'PENDENTE').length || 0

                  return (
                  <React.Fragment key={p.id}>
                    <tr className={`transition cursor-pointer ${nfsPendentes > 0 ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50/80'}`} onClick={() => toggleRow(p.id, nfsPendentes)}>
                      <td className="px-2 text-center text-gray-400 font-bold">{expandedRow === p.id ? '▼' : '▶'}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{p.profiles?.nome_empresa}</td>
                      <td className="px-4 py-3 font-medium text-gray-700">{p.demandas?.titulo}</td>
                      <td className="px-4 py-3 text-center font-bold text-blue-700 bg-white/50">
                        {p.quantidade_disponivel ? Number(p.quantidade_disponivel).toLocaleString('pt-BR') : '0'}
                      </td>
                      <td className="px-4 py-3 font-bold text-green-700">
                        {p.moeda === 'USD' ? 'US$ ' : 'R$ '}{Number(p.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {nfsPendentes > 0 ? (
                          <span className="animate-pulse bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow">
                            {nfsPendentes} Nova{nfsPendentes > 1 ? 's' : ''} NF{nfsPendentes > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center space-x-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePausarAdmin(p.id); }}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition shadow-sm uppercase"
                        >
                          Pausar / STOP
                        </button>
                        <Link href={`/admin/demandas/${p.demandas.id}`} className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition shadow-sm" onClick={e => e.stopPropagation()}>
                          Ver Cotação
                        </Link>
                      </td>
                    </tr>

                    {expandedRow === p.id && (
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <td colSpan={7} className="p-6">
                          <div className="flex flex-col md:flex-row gap-8">
                            <div className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-fit">
                              <h4 className="font-semibold text-gray-800 mb-4 text-sm">Ajuste de Saldo Manual</h4>
                              <form onSubmit={(e) => handleAbater(e, p.id)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Ação</label>
                                    <select value={tipoAcao} onChange={(e:any) => setTipoAcao(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-green-500 outline-none">
                                      <option value="DESCONTAR">Reduzir Saldo (-)</option>
                                      <option value="ACRESCENTAR">Aumentar Saldo (+)</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantidade</label>
                                    <input type="text" inputMode="decimal" required value={qtdAbater} onChange={handleQtdChange} className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-green-500 outline-none" placeholder="Ex: 5.000" />
                                  </div>
                                </div>
                                <button type="submit" disabled={submitting} className="w-full py-2 bg-slate-700 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition">
                                  {submitting ? 'A atualizar...' : 'Confirmar Ajuste Manual'}
                                </button>
                              </form>
                            </div>

                            <div className="flex-[1.5]">
                              <h4 className="font-semibold text-gray-800 mb-4 text-sm">Histórico de NFs e Ajustes</h4>
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                {p.contrato_abatimentos?.length === 0 && <p className="text-xs text-gray-500 italic">Nenhum registo efetuado.</p>}
                                {p.contrato_abatimentos?.map((abatimento: any) => (
                                  <div key={abatimento.id} className={`p-3 rounded-lg shadow-sm border flex justify-between items-center ${abatimento.status_nf === 'RECUSADA' ? 'bg-red-50/50 border-red-200' : 'bg-white border-gray-200'}`}>
                                    <div>
                                      <p className={`text-sm font-bold ${abatimento.status_nf === 'RECUSADA' ? 'text-red-700 line-through' : 'text-gray-900'}`}>
                                        {Number(abatimento.quantidade) < 0 ? '+' : '-'} {Math.abs(Number(abatimento.quantidade)).toLocaleString('pt-BR')} un
                                      </p>
                                      <p className="text-[10px] text-gray-500 mt-0.5">{new Date(abatimento.created_at).toLocaleString('pt-BR')}</p>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                      {abatimento.status_nf === 'RECUSADA' && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-bold text-red-700 px-2">NF RECUSADA</span>
                                          {abatimento.recusa_url && (
                                            <a href={abatimento.recusa_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold bg-red-100 text-red-800 px-2 py-1 rounded border border-red-200 hover:bg-red-200">
                                              📌 Anexo de Recusa
                                            </a>
                                          )}
                                        </div>
                                      )}
                                      {abatimento.nf_url ? (
                                        <>
                                          <a href={abatimento.nf_url} target="_blank" className="text-[10px] font-semibold bg-green-50 text-green-700 px-2 py-1.5 rounded border border-green-200 hover:bg-green-100">
                                            📄 Ver NF
                                          </a>
                                          {abatimento.status_nf !== 'RECUSADA' && (
                                            <button onClick={() => openRecusaModal(abatimento.id)} className="text-[10px] font-semibold bg-white text-red-600 px-2 py-1.5 rounded border border-red-200 hover:bg-red-50">
                                              Recusar
                                            </button>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                                          {Number(abatimento.quantidade) < 0 ? 'Acréscimo Manual' : 'Baixa Manual'}
                                        </span>
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
                )})}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {recusaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Recusar Nota Fiscal</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Ao recusar, o saldo de itens será devolvido ao contrato do fornecedor. Você pode anexar um comprovante ou documento de recusa abaixo (opcional).
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Anexo da Recusa / Justificativa (Opcional - PDF)
              </label>
              <input type="file" accept=".pdf" onChange={(e) => setRecusaFile(e.target.files?.[0] || null)} className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setRecusaModalOpen(false)} disabled={recusando} className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition">Cancelar</button>
              <button onClick={handleConfirmRecusa} disabled={recusando} className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50">
                {recusando ? 'A processar...' : 'Confirmar Recusa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}