import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Busca APENAS as demandas que estão ABERTAS
  const { data: demandas } = await supabase
    .from('demandas')
    .select(`
      *,
      propostas (
        fornecedor_id
      )
    `)
    .eq('status', 'ABERTA') // Filtro aplicado!
    .order('created_at', { ascending: false })

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed relative p-4 md:p-8"
      style={{ 
        backgroundImage: "url('https://fortgreen.com.br/public/images/og-img/dc0323873922ee19b3cde9102758845d.jpg')" 
      }}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" />

      <div className="relative z-10 max-w-[98%] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white drop-shadow-md">
              Cotações em Aberto
            </h1>
            <p className="text-sm text-gray-200 drop-shadow-sm">
              Análise e receção de orçamentos pendentes
            </p>
          </div>
          
          <div className="flex gap-3">
            <Link 
              href="/admin/fornecedores/novo" 
              className="bg-white/90 hover:bg-white text-gray-800 font-medium px-4 py-2 rounded-lg shadow-md transition whitespace-nowrap text-sm"
            >
              + Cadastrar Fornecedor
            </Link>
            <Link 
              href="/admin/demandas/nova" 
              className="bg-green-700 hover:bg-green-800 text-white font-medium px-4 py-2 rounded-lg shadow-md transition whitespace-nowrap text-sm"
            >
              + Nova Cotação
            </Link>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="p-4 border-b bg-gray-50/80">
            <h2 className="font-semibold text-gray-800">Demandas Pendentes de Encerramento</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead className="bg-gray-100/80 border-b text-xs uppercase text-gray-600">
                <tr>
                  <th className="p-4">Título</th>
                  <th className="p-4">Data Limite</th>
                  <th className="p-4 text-center">Propostas</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/60 text-sm">
                {demandas?.map((d: any) => {
                  const fornecedoresUnicos = new Set(d.propostas?.map((p: any) => p.fornecedor_id)).size

                  return (
                    <tr key={d.id} className="hover:bg-gray-50/80 transition">
                      <td className="p-4 font-medium text-gray-900">{d.titulo}</td>
                      <td className="p-4 text-gray-700">{new Date(d.data_limite).toLocaleDateString('pt-BR')}</td>
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {fornecedoresUnicos === 0 
                            ? 'Sem propostas' 
                            : `${fornecedoresUnicos} ${fornecedoresUnicos === 1 ? 'Fornecedor' : 'Fornecedores'}`}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Link
                          href={`/admin/demandas/${d.id}`}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-700 text-white hover:bg-green-800 transition inline-block shadow-sm"
                        >
                          Analisar & Encerrar
                        </Link>
                      </td>
                    </tr>
                  )
                })}
                {(!demandas || demandas.length === 0) && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-500 py-8">
                      Nenhuma cotação em aberto no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}