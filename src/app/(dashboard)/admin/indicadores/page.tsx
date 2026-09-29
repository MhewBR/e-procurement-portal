'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { exportToCSV } from '@/lib/exportToExcel'

export default function IndicadoresBIPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [topFornecedores, setTopFornecedores] = useState<any[]>([])
  const [rawExportData, setRawExportData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const loadBI = async () => {
    // Busca apenas o status das demandas para contagem rápida
    const { data: demandas } = await supabase.from('demandas').select('id, status')
    
    // Busca as propostas COM o histórico de abatimentos (NFs) para sabermos a quantidade original
    const { data: propostas } = await supabase
      .from('propostas')
      .select('*, demandas(id, titulo, status, quantidade), profiles:fornecedor_id(nome_empresa), contrato_abatimentos(quantidade, status_nf)')
    
    const { data: abatimentos } = await supabase.from('contrato_abatimentos').select('nf_url')

    let totalCotacoes = demandas?.length || 0
    let totalAbertas = demandas?.filter(d => d.status === 'ABERTA').length || 0
    let totalConcluidas = demandas?.filter(d => d.status === 'CONCLUIDA').length || 0
    let totalCanceladas = demandas?.filter(d => d.status === 'CANCELADA').length || 0

    let volumeAtivoBRL = 0
    let volumeAtivoUSD = 0
    let totalSavingBRL = 0
    let totalSavingUSD = 0

    const fornecedorMap: Record<string, { nome: string; contratos: number; totalBRL: number }> = {}
    const exportList: any[] = []

    // 1. Encontra o MAIOR preço unitário orçado para CADA demanda
    const maiorPrecoPorDemanda: Record<string, number> = {}
    propostas?.forEach((p: any) => {
      const dId = p.demanda_id
      const preco = Number(p.valor_total || 0)
      if (!maiorPrecoPorDemanda[dId] || preco > maiorPrecoPorDemanda[dId]) {
        maiorPrecoPorDemanda[dId] = preco
      }
    })

    // 2. Calcula Volume Ativo (pelo Saldo Restante) e Saving (pelo Saldo Original)
    propostas?.forEach((p: any) => {
      const isVencedora = p.vencedora
      const isAtivo = p.vencedora && p.status_contrato === 'ATIVO'
      
      const valorUnitario = Number(p.valor_total || 0)
      const saldoRestante = Number(p.quantidade_disponivel || p.demandas?.quantidade || 0)
      
      // Reconstrói a quantidade inicial somando o saldo restante com as baixas/NFs já ocorridas
      let qtdJaEntregue = 0
      if (p.contrato_abatimentos) {
        p.contrato_abatimentos.forEach((ab: any) => {
          if (ab.status_nf !== 'RECUSADA') {
            qtdJaEntregue += Number(ab.quantidade || 0)
          }
        })
      }
      const qtdOriginalContratada = saldoRestante + qtdJaEntregue

      // O volume financeiro pendente na rua (baseado APENAS no que falta entregar)
      const volumePendenteCalculado = saldoRestante === 0 ? 0 : valorUnitario * saldoRestante

      if (isAtivo && saldoRestante > 0) {
        if (p.moeda === 'USD') volumeAtivoUSD += volumePendenteCalculado
        else volumeAtivoBRL += volumePendenteCalculado

        // Agrupa por fornecedor para o Top 5
        const fNome = p.profiles?.nome_empresa || 'Desconhecido'
        if (!fornecedorMap[fNome]) {
          fornecedorMap[fNome] = { nome: fNome, contratos: 0, totalBRL: 0 }
        }
        fornecedorMap[fNome].contratos += 1
        fornecedorMap[fNome].totalBRL += p.moeda === 'USD' ? volumePendenteCalculado * 5.6 : volumePendenteCalculado
      }

      // CÁLCULO DO SAVING HISTÓRICO (Baseado na Quantidade Original Fechada)
      if (isVencedora) {
        const maiorPreco = maiorPrecoPorDemanda[p.demanda_id] || valorUnitario
        const diferencaUnitarias = maiorPreco - valorUnitario

        if (diferencaUnitarias > 0 && qtdOriginalContratada > 0) {
          const economiaTotal = diferencaUnitarias * qtdOriginalContratada
          if (p.moeda === 'USD') totalSavingUSD += economiaTotal
          else totalSavingBRL += economiaTotal
        }
      }

      // Lista para exportação geral em Excel
      exportList.push({
        'Cotação / Demanda': p.demandas?.titulo || '-',
        'Fornecedor': p.profiles?.nome_empresa || '-',
        'Moeda': p.moeda || 'BRL',
        'Valor Unitário Proposto': valorUnitario,
        'Quantidade Contratada Inicial': qtdOriginalContratada,
        'Saldo Restante Atual': saldoRestante,
        'Volume Financeiro Restante': volumePendenteCalculado,
        'Vencedora': isVencedora ? 'SIM' : 'NÃO',
        'Status Contrato': p.status_contrato || 'N/A',
        'Tipo Frete': p.tipo_frete || '-',
        'Cond. Pagamento': p.condicao_pagamento || '-'
      })
    })

    const topArr = Object.values(fornecedorMap).sort((a, b) => b.totalBRL - a.totalBRL).slice(0, 5)

    setMetrics({
      totalCotacoes,
      totalAbertas,
      totalConcluidas,
      totalCanceladas,
      volumeAtivoBRL,
      volumeAtivoUSD,
      totalSavingBRL,
      totalSavingUSD,
      totalNfsEnviadas: abatimentos?.filter(a => a.nf_url).length || 0
    })

    setTopFornecedores(topArr)
    setRawExportData(exportList)
    setLoading(false)
  }

  useEffect(() => { loadBI() }, [])

  const handleExportarExcel = () => {
    exportToCSV(rawExportData, 'Relatorio_Executivo_Procurement_Fortgreen')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">A carregar indicadores...</div>

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed relative p-4 md:p-8" style={{ backgroundImage: "url('https://fortgreen.com.br/public/images/og-img/dc0323873922ee19b3cde9102758845d.jpg')" }}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" />
      
      <div className="relative z-10 max-w-[98%] mx-auto space-y-6">
        
        {/* Cabeçalho do BI */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white drop-shadow-md">Painel de Indicadores (BI)</h1>
            <p className="text-sm text-gray-200">Visão estratégica e métricas de desempenho de Suprimentos</p>
          </div>

          <button
            onClick={handleExportarExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-lg shadow-lg transition flex items-center gap-2 text-xs uppercase tracking-wider border border-emerald-500/30 w-fit"
          >
            📊 Exportar Relatório Geral (Excel .csv)
          </button>
        </div>

        {/* Cartões Principais (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Cartão de Saving Corrigido */}
          <div className="bg-white/95 backdrop-blur-md p-5 rounded-xl border border-white/20 shadow-xl">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Saving Real (Economia)</span>
            
            {metrics?.totalSavingUSD > 0 && (
              <p className="text-xl font-black text-green-700 mt-2">
                US$ {metrics?.totalSavingUSD?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}

            {metrics?.totalSavingBRL > 0 && (
              <p className="text-xl font-black text-green-700 mt-1">
                R$ {metrics?.totalSavingBRL?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}

            {(!metrics?.totalSavingBRL && !metrics?.totalSavingUSD) && (
              <p className="text-2xl font-black text-gray-400 mt-2">R$ 0,00</p>
            )}

            <span className="text-[10px] text-gray-400 mt-1 block">Preservado pelo total contratado inicialmente</span>
          </div>

          <div className="bg-white/95 backdrop-blur-md p-5 rounded-xl border border-white/20 shadow-xl">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Backlog em Contratos</span>
            <p className="text-xl font-bold text-blue-900 mt-2">
              R$ {metrics?.volumeAtivoBRL?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm font-semibold text-blue-700">
              US$ {metrics?.volumeAtivoUSD?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-gray-400 mt-1 block">Valor financeiro que ainda falta ser entregue</span>
          </div>

          <div className="bg-white/95 backdrop-blur-md p-5 rounded-xl border border-white/20 shadow-xl">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total de Cotações</span>
            <p className="text-3xl font-black text-slate-800 mt-2">{metrics?.totalCotacoes}</p>
            <div className="flex gap-2 text-[10px] mt-2 font-bold">
              <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">{metrics?.totalAbertas} Abertas</span>
              <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{metrics?.totalConcluidas} Concluídas</span>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md p-5 rounded-xl border border-white/20 shadow-xl">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notas Fiscais Recebidas</span>
            <p className="text-3xl font-black text-indigo-700 mt-2">{metrics?.totalNfsEnviadas}</p>
            <span className="text-[10px] text-gray-400 mt-1 block">Faturamentos parciais auditados</span>
          </div>

        </div>

        {/* Tabela de Top Fornecedores */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 overflow-hidden p-6">
          <h3 className="text-base font-bold text-gray-800 mb-4">Top Fornecedores por Backlog Restante</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100/80 border-b text-[11px] uppercase text-gray-600">
                <tr>
                  <th className="p-3">Posição</th>
                  <th className="p-3">Fornecedor</th>
                  <th className="p-3 text-center">Contratos Ativos</th>
                  <th className="p-3 text-right">Volume Restante (BRL)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {topFornecedores.map((f, idx) => (
                  <tr key={f.nome} className="hover:bg-gray-50 transition">
                    <td className="p-3 font-bold text-gray-400">#{idx + 1}</td>
                    <td className="p-3 font-semibold text-gray-900">{f.nome}</td>
                    <td className="p-3 text-center font-medium">{f.contratos}</td>
                    <td className="p-3 text-right font-bold text-green-700">
                      R$ {f.totalBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {topFornecedores.length === 0 && (
                  <tr><td colSpan={4} className="p-4 text-center text-gray-500">Nenhum volume financeiro restante registado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}