'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AdminFinalizadosPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submittingBulk, setSubmittingBulk] = useState(false)
  const supabase = createClient()

  const loadData = async () => {
    // 1. Busca propostas encerradas/pausadas ou com saldo zerado
    const { data: propostasData } = await supabase
      .from('propostas')
      .select(`
        *,
        demandas!inner(id, titulo, status, data_limite),
        profiles:fornecedor_id(nome_empresa)
      `)
      .eq('vencedora', true)
      .in('status_contrato', ['PAUSADO', 'FINALIZADO'])
      .order('created_at', { ascending: false })

    // 2. Busca demandas canceladas sem vencedores
    const { data: demandasCanceladas } = await supabase
      .from('demandas')
      .select('*')
      .eq('status', 'CANCELADA')
      .order('created_at', { ascending: false })

    const list: any[] = []

    propostasData?.forEach((p: any) => {
      const saldo = Number(p.quantidade_disponivel || 0)
      let labelStatus = 'CONTRATO PAUSADO (STOP)'
      let colorClass = 'bg-amber-100 text-amber-800 border-amber-200'

      if (p.status_contrato === 'FINALIZADO' || saldo <= 0) {
        labelStatus = 'FINALIZADO'
        colorClass = 'bg-blue-100 text-blue-800 border-blue-200'
      }

      list.push({
        id: p.id,
        demandaId: p.demandas.id,
        tipo: 'PROPOSTA',
        titulo: p.demandas.titulo,
        fornecedor: p.profiles?.nome_empresa,
        saldo: saldo,
        dataLimite: p.demandas.data_limite,
        statusLabel: labelStatus,
        colorClass: colorClass,
        statusContratoOriginal: p.status_contrato
      })
    })

    demandasCanceladas?.forEach((d: any) => {
      list.push({
        id: d.id,
        demandaId: d.id,
        tipo: 'DEMANDA_CANCELADA',
        titulo: d.titulo,
        fornecedor: '-',
        saldo: 0,
        dataLimite: d.data_limite,
        statusLabel: 'CANCELADA',
        colorClass: 'bg-red-100 text-red-800 border-red-200',
        statusContratoOriginal: 'CANCELADA'
      })
    })

    setItems(list)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleMarcarFinalizado = async (propostaId: string) => {
    if (!confirm('Confirma alterar este contrato pausado para FINALIZADO definitivamente?')) return
    try {
      const res = await fetch('/api/admin/contratos/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propostaId, statusContrato: 'FINALIZADO' })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status')
    }
  }

  const handleFinalizarTodasPausadas = async () => {
    if (!confirm('Tem certeza que deseja alterar TODOS os contratos pausados para FINALIZADOS de uma só vez?')) return
    
    setSubmittingBulk(true)
    try {
      const res = await fetch('/api/admin/contratos/finalizar-todas-pausadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Erro ao finalizar todas as pausadas')
    } finally {
      setSubmittingBulk(false)
    }
  }

  const temPausadas = items.some(i => i.statusLabel === 'CONTRATO PAUSADO (STOP)')

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Carregando histórico...</div>

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed relative p-4 md:p-8" style={{ backgroundImage: "url('https://fortgreen.com.br/public/images/og-img/dc0323873922ee19b3cde9102758845d.jpg')" }}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" />
      <div className="relative z-10 max-w-[98%] mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white drop-shadow-md">Histórico e Contratos Encerrados</h1>
            <p className="text-sm text-gray-200">Cotações canceladas, pausadas ou concluídas por saldo</p>
          </div>

          {temPausadas && (
            <button
              onClick={handleFinalizarTodasPausadas}
              disabled={submittingBulk}
              className="bg-blue-700 hover:bg-blue-800 text-white font-medium px-4 py-2.5 rounded-lg shadow-lg transition whitespace-nowrap text-xs uppercase tracking-wider disabled:opacity-50 border border-blue-500/30"
            >
              {submittingBulk ? 'A processar...' : '✓ Finalizar Todas as Pausadas'}
            </button>
          )}
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead className="bg-gray-100/80 border-b text-[11px] uppercase text-gray-600 tracking-tight">
                <tr>
                  <th className="px-4 py-3">Item / Cotação</th>
                  <th className="px-4 py-3">Fornecedor</th>
                  <th className="px-4 py-3 text-center">Saldo Restante</th>
                  <th className="px-4 py-3 text-center">Status do Contrato</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/60 text-sm">
                {items?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.titulo}</td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{item.fornecedor}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-700">
                      {item.tipo === 'PROPOSTA' ? Number(item.saldo).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border ${item.colorClass}`}>
                        {item.statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center space-x-2">
                      {item.tipo === 'PROPOSTA' && item.statusLabel === 'CONTRATO PAUSADO (STOP)' && (
                        <button
                          onClick={() => handleMarcarFinalizado(item.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition shadow-sm"
                        >
                          Marcar como Finalizado
                        </button>
                      )}
                      <Link
                        href={`/admin/demandas/${item.demandaId}`}
                        className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-gray-700 text-white hover:bg-gray-800 transition shadow-sm"
                      >
                        Ver Detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
                {(!items || items.length === 0) && (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}