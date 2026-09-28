import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { propostaId, quantidadeAAbater, nfUrl, acao = 'DESCONTAR' } = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isFornecedor = profile?.role === 'FORNECEDOR'

    if (isFornecedor && !nfUrl) {
      return NextResponse.json({ error: 'A Nota Fiscal é obrigatória para o abatimento.' }, { status: 400 })
    }

    const { data: proposta } = await supabase.from('propostas').select('quantidade_disponivel').eq('id', propostaId).single()
    if (!proposta) throw new Error('Contrato não encontrado')

    const saldoAtual = Number(proposta.quantidade_disponivel || 0)
    let qtdAbater = Number(quantidadeAAbater)

    // Se o Admin escolher ACRESCENTAR, a quantidade fica negativa para SOMAR no saldo final
    if (!isFornecedor && acao === 'ACRESCENTAR') {
      qtdAbater = -Math.abs(qtdAbater)
    } else {
      qtdAbater = Math.abs(qtdAbater)
    }

    if (acao === 'DESCONTAR' && (qtdAbater <= 0 || qtdAbater > saldoAtual)) {
      return NextResponse.json({ error: 'Quantidade a descontar maior que o saldo atual.' }, { status: 400 })
    }

    // Se for o admin a fazer a ação, já fica como VISTA. Se for fornecedor, PENDENTE.
    const statusNf = isFornecedor ? 'PENDENTE' : 'VISTA'

    const { error: insertError } = await supabase.from('contrato_abatimentos').insert([{
      proposta_id: propostaId,
      quantidade: qtdAbater,
      nf_url: nfUrl || null,
      criado_por: user.id,
      status_nf: statusNf
    }])
    if (insertError) throw insertError

    // O saldo é subtraído (se a qtd for negativa, subtrair um negativo faz somar!)
    const novoSaldo = saldoAtual - qtdAbater
    const { error: updateError } = await supabase.from('propostas').update({ quantidade_disponivel: novoSaldo }).eq('id', propostaId)
    if (updateError) throw updateError

    return NextResponse.json({ success: true, novoSaldo })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}