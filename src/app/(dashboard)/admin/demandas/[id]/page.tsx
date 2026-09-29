'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminDetalhesDemandaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: demandaId } = use(params)

  const [demanda, setDemanda] = useState<any>(null)
  const [propostas, setPropostas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  const loadData = async () => {
    // 1. VERIFICAÇÃO DE SEGURANÇA
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'ADMIN') {
      router.push('/fornecedor')
      return
    }

    // 2. Busca os dados da cotação
    const { data: demData } = await supabase
      .from('demandas')
      .select('*')
      .eq('id', demandaId)
      .single()

    // 3. Busca as propostas recebidas
    const { data: propData } = await supabase
      .from('propostas')
      .select('*, profiles:fornecedor_id(nome_empresa)')
      .eq('demanda_id', demandaId)
      .order('created_at', { ascending: false })

    setDemanda(demData)
    setPropostas(propData || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [demandaId])

  // Aprovar Vencedor sem encerrar a cotação
  const handleAprovarVencedor = async (proposta: any) => {
    const confirmacao = confirm(`Deseja aprovar a proposta da ${proposta.profiles?.nome_empresa}?\nA cotação continuará aberta para que possa aprovar outros fornecedores se necessário.`)
    
    if (!confirmacao) return

    setSubmitting(true)
    try {
      const { error: winnerError } = await supabase
        .from('propostas')
        .update({
          vencedora: true,
          status_contrato: 'ATIVO'
        })
        .eq('id', proposta.id)

      if (winnerError) throw winnerError

      alert('Proposta aprovada com sucesso! Você pode aprovar mais propostas ou encerrar a cotação no topo da página.')
      await loadData()
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Erro ao aprovar proposta.')
    } finally {
      setSubmitting(false)
    }
  }

  // Botão explícito para Encerrar a Cotação
  const handleEncerrarDemanda = async () => {
    const vencedores = propostas.filter(p => p.vencedora)
    
    let mensagem = 'Tem certeza que deseja ENCERRAR esta cotação definitivamente?'
    if (vencedores.length === 0) {
      mensagem += '\n\nATENÇÃO: Você não aprovou nenhum vencedor. Se encerrar agora, a cotação será finalizada sem contratos ativos.'
    } else {
      mensagem += `\n\nVocê aprovou ${vencedores.length} fornecedor(es) para esta cotação.`
    }

    if (!confirm(mensagem)) return

    setSubmitting(true)
    try {
      const { error: demandaError } = await supabase
        .from('demandas')
        .update({ status: 'CONCLUIDA' })
        .eq('id', demandaId)

      if (demandaError) throw demandaError

      alert('Cotação encerrada com sucesso!')
      router.push('/admin/contratos')
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Erro ao encerrar cotação.')
    } finally {
      setSubmitting(false)
    }
  }

  // Reativar Cotação
  const handleReativarDemanda = async () => {
    if (!confirm('Deseja reabrir esta cotação? Os contratos atuais serão mantidos, mas a cotação voltará a receber propostas.')) return

    setSubmitting(true)
    try {
      const { error: demErr } = await supabase
        .from('demandas')
        .update({ status: 'ABERTA' })
        .eq('id', demandaId)

      if (demErr) throw demErr

      alert('Cotação reaberta com sucesso!')
      await loadData()
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Erro ao reabrir cotação.')
    } finally {
      setSubmitting(false)
    }
  }

  // Cancelar Cotação
  const handleCancelarDemanda = async () => {
    if (!confirm('Atenção: Confirma o cancelamento definitivo desta cotação? Todas as propostas (mesmo as vencedoras) ficarão invalidadas.')) return

    setSubmitting(true)
    try {
      await supabase
        .from('propostas')
        .update({ vencedora: false, status_contrato: 'CANCELADO' })
        .eq('demanda_id', demandaId)

      const { error } = await supabase
        .from('demandas')
        .update({ status: 'CANCELADA' })
        .eq('id', demandaId)

      if (error) throw error

      alert('Cotação cancelada.')
      router.push('/admin/finalizados')
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar cotação.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Verificando permissões...</div>

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed relative p-4 md:p-8" style={{ backgroundImage: "url('https://fortgreen.com.br/public/images/og-img/dc0323873922ee19b3cde9102758845d.jpg')" }}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" />

      <div className="relative z-10 max-w-[98%] mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white/95 backdrop-blur-md p-6 rounded-xl border border-white/20 shadow-2xl">
          <div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded uppercase ${
                demanda?.status === 'ABERTA' ? 'bg-green-100 text-green-800' :
                demanda?.status === 'CONCLUIDA' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
              }`}>
                {demanda?.status}
              </span>
              <h1 className="text-2xl font-bold text-gray-900">{demanda?.titulo}</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Data Limite: {demanda?.data_limite ? new Date(demanda.data_limite).toLocaleString('pt-BR') : '-'}
            </p>
          </div>

          <div className="flex gap-3">
            <Link href="/admin" className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition shadow-sm">
              Voltar
            </Link>

            {demanda?.status === 'ABERTA' && (
              <>
                <button onClick={handleCancelarDemanda} disabled={submitting} className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50 shadow-sm">
                  Cancelar Cotação
                </button>
                <button onClick={handleEncerrarDemanda} disabled={submitting} className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition disabled:opacity-50 shadow-sm uppercase">
                  Encerrar Cotação
                </button>
              </>
            )}

            {(demanda?.status === 'CONCLUIDA' || demanda?.status === 'CANCELADA') && (
              <button 
                onClick={handleReativarDemanda} 
                disabled={submitting} 
                className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition disabled:opacity-50 shadow-sm uppercase tracking-wider"
              >
                {submitting ? 'A reativar...' : '🔄 Reativar / Reabrir Cotação'}
              </button>
            )}
          </div>
        </div>

        {/* Detalhes da Solicitação */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-lg">
            <span className="text-xs font-bold text-gray-500 uppercase">Quantidade Solicitada</span>
            <p className="text-2xl font-black text-blue-900 mt-1">
              {demanda?.quantidade ? Number(demanda.quantidade).toLocaleString('pt-BR') : '-'} un
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-lg">
            <span className="text-xs font-bold text-gray-500 uppercase">Data da Necessidade</span>
            <p className="text-xl font-bold text-gray-800 mt-1">
              {demanda?.data_necessidade ? new Date(demanda.data_necessidade + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-lg">
            <span className="text-xs font-bold text-gray-500 uppercase">Observações</span>
            <p className="text-xs text-gray-700 italic mt-1">{demanda?.descricao || 'Sem observações.'}</p>
          </div>
        </div>

        {/* Propostas Recebidas */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 overflow-hidden p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Propostas Recebidas ({propostas.length})</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead className="bg-gray-100/80 border-b text-[11px] uppercase text-gray-600">
                <tr>
                  <th className="p-3">Fornecedor</th>
                  <th className="p-3">Valor Total</th>
                  <th className="p-3 text-center">Capacidade/Qtd Oferta</th>
                  <th className="p-3 text-center">Frete / Pagamento</th>
                  <th className="p-3 text-center">Entrega Prevista</th>
                  <th className="p-3 text-center">Anexo PDF</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {propostas.map((p) => (
                  <tr key={p.id} className={`hover:bg-gray-50 transition ${p.vencedora ? 'bg-green-50/80' : ''}`}>
                    <td className="p-3">
                      <div className="font-semibold text-gray-900">{p.profiles?.nome_empresa}</div>
                      {/* CNPJ DE FATURAMENTO (Ajuste p.cnpj_faturamento se o nome for diferente no BD) */}
                      {p.cnpj_faturamento && (
                        <div className="text-[10px] text-gray-500 mt-0.5">CNPJ Fat: {p.cnpj_faturamento}</div>
                      )}
                      {/* OBSERVAÇÃO DO FORNECEDOR */}
                      {p.observacao && (
                        <div className="text-[10px] text-gray-500 italic mt-1 bg-gray-100 p-1.5 rounded" title={p.observacao}>
                          Obs: {p.observacao}
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-bold text-green-700">
                      {p.moeda === 'USD' ? 'US$ ' : 'R$ '}{Number(p.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center font-bold text-blue-800">
                      {p.quantidade_disponivel ? Number(p.quantidade_disponivel).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="p-3 text-center text-xs">
                      <span className="font-bold">{p.tipo_frete}</span> | {p.condicao_pagamento}
                    </td>
                    <td className="p-3 text-center text-xs text-gray-700">
                      {p.data_entrega ? new Date(p.data_entrega).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="p-3 text-center">
                      {p.pdf_url ? (
                        <a href={p.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded border border-blue-200 hover:bg-blue-100 whitespace-nowrap">
                          📄 Ver PDF
                        </a>
                      ) : '-'}
                    </td>
                    <td className="p-3 text-center">
                      {demanda?.status === 'ABERTA' ? (
                        !p.vencedora ? (
                          <button
                            onClick={() => handleAprovarVencedor(p)}
                            disabled={submitting}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-green-700 hover:bg-green-800 text-white transition shadow-sm uppercase disabled:opacity-50 whitespace-nowrap"
                          >
                            Aprovar Vencedor
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-green-800 bg-green-100 px-2 py-1 rounded-full border border-green-200 inline-flex items-center gap-1 whitespace-nowrap">
                            <span>✓ Aprovado</span>
                          </span>
                        )
                      ) : p.vencedora ? (
                        <span className="text-xs font-bold text-green-800 bg-green-100 px-2 py-1 rounded-full border border-green-200 inline-flex items-center gap-1 whitespace-nowrap">
                          <span>✓ Vencedor Definitivo</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {propostas.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-gray-500">Nenhuma proposta recebida para esta cotação até o momento.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}