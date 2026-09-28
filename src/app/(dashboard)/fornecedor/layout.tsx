// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function FornecedorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, nome_empresa')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'FORNECEDOR' && profile.role !== 'ADMIN')) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50 px-4 py-3">
        <div className="max-w-[98%] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/fornecedor" className="text-xl font-extrabold text-green-500 tracking-wider">
              FORTGREEN
            </Link>
            <nav className="hidden md:flex gap-4 text-sm font-medium text-slate-300">
              <Link href="/fornecedor" className="hover:text-white transition">
                Mural de Cotações
              </Link>
              <Link href="/fornecedor/contratos" className="hover:text-white transition">
                Meus Contratos Ativos
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-300 hidden sm:inline">{user.email}</span>
            <span className="bg-green-800/60 text-green-300 px-2 py-0.5 rounded font-bold uppercase">
              Fornecedor
            </span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded font-semibold transition">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}