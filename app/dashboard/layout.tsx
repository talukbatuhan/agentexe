import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div>
            {/* Navigation Header */}
            <nav className="bg-white/5 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-14 sm:h-16">
                        <div className="flex items-center gap-2">
                            <div className="bg-purple-500/20 p-2 rounded-lg">
                                <span className="text-purple-400 font-bold">HG</span>
                            </div>
                            <span className="text-white font-semibold">HomeGuardian</span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4">
                            <div className="hidden sm:block text-sm text-slate-400">
                                {user.email}
                            </div>
                            <form action="/api/auth/signout" method="post">
                                <button
                                    type="submit"
                                    className="px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium text-white transition-colors"
                                >
                                    Sign Out
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Page Content */}
            {children}
        </div>
    )
}
