import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas administradores podem realizar esta ação.' }, { status: 403 })
    }

    // Altera TODOS os contratos que estiverem com status PAUSADO para FINALIZADO
    const { error } = await supabase
      .from('propostas')
      .update({ status_contrato: 'FINALIZADO' })
      .eq('status_contrato', 'PAUSADO')

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}