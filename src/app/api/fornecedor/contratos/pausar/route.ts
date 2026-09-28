import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { propostaId } = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    // Atualiza o status do contrato para PAUSADO garantindo que pertence ao fornecedor logado
    const { error } = await supabase
      .from('propostas')
      .update({ status_contrato: 'PAUSADO' })
      .eq('id', propostaId)
      .eq('fornecedor_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}