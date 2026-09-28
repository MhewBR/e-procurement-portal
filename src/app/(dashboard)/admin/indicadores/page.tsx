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
    // 1. Busca todas as demandas e propostas
    const { data: demandas } = await supabase.from('demandas').select('*, propostas(*, profiles:fornecedor_id(nome_empresa))')
    const { data: propostas } = await supabase.from('propostas').select('*, demandas(titulo), profiles:fornecedor_id(nome_empresa)')
    const { data: abatimentos } = await supabase.from('contrato_abatimentos').select('*')

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

    propostas?.forEach((p: any) => {
      const isVencedora = p.vencedora
      const isAtivo = p.status_contrato === 'ATIVO' && p.demandas?.status === 'CONCLUIDA'
      const valor = Number(p.valor_total || 0)

      if (isAtivo) {
        if (p.moeda === 'USD') volumeAtivoUSD += valor
        else volumeAtivoBRL += valor

        // Agrupa por fornecedor
        const fNome = p.profiles?.nome_empresa || 'Desconhecido'
        if (!fornecedorMap[fNome]) {
          fornecedorMap[fNome] = { nome: fNome, contratos: 0, totalBRL: 0 }
        }
        fornecedorMap[fNome].contratos += 1
        fornecedorMap[fNome].totalBRL += p.moeda === 'USD' ? valor * 5.6 : valor // Converte USD para estimativa BRL
      }

      // Lista para exportação geral em Excel
      exportList.push({
        'Cotação / Demanda': p.demandas?.titulo || '-',
        'Fornecedor': p.profiles?.nome_empresa || '-',
        'Moeda': p.moeda || 'BRL',
        'Valor Proposto': valor,
        'Vencedora': isVencedora ? 'SIM' : 'NÃO',
        'Status Contrato': p.status_contrato || 'N/A',
        'Quantidade Saldo': p.quantidade_disponivel || 0,
        'Tipo Frete': p.tipo_frete || '-',
        'Cond. Pagamento': p.condicao_pagamento || '-'
      })
    })

    // Cálculo do Saving separando BRL e USD (Diferença entre a maior proposta e a vencedora)
    demandas?.forEach(d => {
      if (d.propostas && d.propostas.length > 1) {
        const vencedora = d.propostas.find((p: any) => p.vencedora)
        const maiorVal = Math.max(...d.propostas.map((p: any) => Number(p.valor_total || 0)))
        
        if (vencedora) {
          const economia = maiorVal - Number(vencedora.valor_total || 0)
          if (economia > 0) {
            if (vencedora.moeda === 'USD') {
              totalSavingUSD += economia
            } else {
              totalSavingBRL += economia
            }
          }
        }
      }
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
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Saving Estimado (Economia)</span>
            
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

            <span className="text-[10px] text-gray-400 mt-1 block">Diferença vs. maior proposta recebida</span>
          </div>

          <div className="bg-white/95 backdrop-blur-md p-5 rounded-xl border border-white/20 shadow-xl">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Volume em Contratos Ativos</span>
            <p className="text-xl font-bold text-blue-900 mt-2">
              R$ {metrics?.volumeAtivoBRL?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm font-semibold text-blue-700">
              US$ {metrics?.volumeAtivoUSD?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
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
          <h3 className="text-base font-bold text-gray-800 mb-4">Top Fornecedores por Volume em Contratos</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100/80 border-b text-[11px] uppercase text-gray-600">
                <tr>
                  <th className="p-3">Posição</th>
                  <th className="p-3">Fornecedor</th>
                  <th className="p-3 text-center">Contratos Ativos</th>
                  <th className="p-3 text-right">Volume Aprox. (BRL)</th>
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
                  <tr><td colSpan={4} className="p-4 text-center text-gray-500">Nenhum contrato ativo registado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}