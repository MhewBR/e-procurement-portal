import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { demandaId, propostaVencedoraId } = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    // 1. Busca a quantidade original solicitada pela Fortgreen na demanda
    const { data: demanda, error: demandaErr } = await supabase
      .from('demandas')
      .select('quantidade')
      .eq('id', demandaId)
      .single()

    if (demandaErr || !demanda) throw new Error('Demanda não encontrada.')

    // 2. Marca todas as propostas da demanda como NÃO vencedoras
    await supabase
      .from('propostas')
      .update({ vencedora: false, status_contrato: null })
      .eq('demanda_id', demandaId)

    // 3. Marca a proposta escolhida como Vencedora e TRAVA o saldo inicial na quantidade da Demanda
    const { error: winnerErr } = await supabase
      .from('propostas')
      .update({ 
        vencedora: true, 
        status_contrato: 'ATIVO',
        quantidade_disponivel: demanda.quantidade // Saldo inicial igual ao pedido pela Fortgreen
      })
      .eq('id', propostaVencedoraId)

    if (winnerErr) throw winnerErr

    // 4. Altera o status da Demanda para CONCLUIDA
    const { error: statusErr } = await supabase
      .from('demandas')
      .update({ status: 'CONCLUIDA' })
      .eq('id', demandaId)

    if (statusErr) throw statusErr

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}