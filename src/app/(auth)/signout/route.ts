import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function handleSignOut(request: Request) {
  const supabase = await createClient()
  
  // Encerra a sessão do usuário no Supabase
  await supabase.auth.signOut()

  // Redireciona para a página de login
  return NextResponse.redirect(new URL('/login', request.url))
}

// Aceita requisições GET (clique em link/botão) e POST (envio de formulário)
export async function GET(request: Request) {
  return handleSignOut(request)
}

export async function POST(request: Request) {
  return handleSignOut(request)
}