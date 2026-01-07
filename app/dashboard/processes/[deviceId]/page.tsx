'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Activity, ArrowLeft, Loader2, X, Shield } from 'lucide-react'

export default function ProcessesPage() {
  const params = useParams()
  const router = useRouter()
  const deviceId = params.deviceId as string
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [processes, setProcesses] = useState<Array<{ pid: number; name: string; memory: number }>>([])
  const [search, setSearch] = useState('')
  const PROTECTED_PROCESSES = new Set<string>([
    'system','registry','smss.exe','csrss.exe','wininit.exe','services.exe',
    'lsass.exe','svchost.exe','fontdrvhost.exe','memory compression',
    'spoolsv.exe','explorer.exe','winlogon.exe','dwm.exe','rdpclip.exe',
    'sihost.exe','taskhostw.exe','ctfmon.exe','searchui.exe','runtimebroker.exe',
    'lockapp.exe','audiodg.exe','wudfhost.exe','werfault.exe','smartscreen.exe',
    'python.exe','pythonw.exe','cmd.exe','conhost.exe','powershell.exe',
    'code.exe','node.exe','npm.exe',
    'applicationframehost.exe','securityhealthservice.exe','searchapp.exe',
    'startmenuexperiencehost.exe','shellexperiencehost.exe','textinputhost.exe',
    'agent.exe','nvcontainer.exe','nvidia share.exe','radeonsoftware.exe'
  ].map(x => x.toLowerCase()))

  useEffect(() => {
    fetchProcesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchProcesses = async () => {
    setLoading(true)
    setProcesses([])
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const commandSentTime = new Date()

      await supabase.from('commands').insert({
        device_id: deviceId,
        parent_id: user?.id || '00000000-0000-0000-0000-000000000000',
        command_type: 'get_running_processes',
        status: 'pending'
      })

      let attempts = 0
      const maxAttempts = 30
      const poll = setInterval(async () => {
        attempts++
        if (attempts > maxAttempts) {
          clearInterval(poll)
          setLoading(false)
          alert('Process list timeout. Agent may be offline or busy.')
          return
        }

        const { data, error } = await supabase
          .from('device_logs')
          .select('*')
          .eq('device_id', deviceId)
          .eq('log_type', 'info')
          .contains('metadata', { subtype: 'process_list' })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) return

        if (data && new Date(data.created_at) > commandSentTime) {
          clearInterval(poll)
          let content = data.content
          if (typeof content === 'string') {
            try { content = JSON.parse(content) } catch { }
          }
          if (content?.processes && Array.isArray(content.processes)) {
            setProcesses(content.processes)
          }
          setLoading(false)
        }
      }, 1000)
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  const [onlyKillable, setOnlyKillable] = useState(false)
  const filtered = processes
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      String(p.pid).includes(search)
    )
    .filter(p => (onlyKillable ? !PROTECTED_PROCESSES.has(p.name.toLowerCase()) : true))
    .sort((a, b) => {
      const ap = PROTECTED_PROCESSES.has(a.name.toLowerCase())
      const bp = PROTECTED_PROCESSES.has(b.name.toLowerCase())
      return Number(ap) - Number(bp)
    })


  return (
    <div className="p-8 max-w-5xl mx-auto text-white min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-red-400" />
            Process Manager
          </h1>
        </div>
        <button
          onClick={() => fetchProcesses()}
          className="text-sm px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg"
        >
          Yenile
        </button>
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-400">
          Toplam: {processes.length} • Görünen: {filtered.length}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyKillable}
            onChange={(e) => setOnlyKillable(e.target.checked)}
          />
          Sadece sonlandırılabilirleri göster
        </label>
      </div>

      <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-4">
        <input
          type="text"
          placeholder="Uygulama ara (örn: chrome)..."
          className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden min-h-[400px]">
        {loading && processes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-red-400" />
            <p>Loading processes...</p>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-12 text-xs text-slate-500 mb-2 px-2 uppercase font-semibold">
              <div className="col-span-6 text-left">Name</div>
              <div className="col-span-3 text-right">PID</div>
              <div className="col-span-3 text-right">Memory</div>
            </div>

            {filtered.map((proc, i) => (
            <div key={i} className="grid grid-cols-12 items-center p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-all text-sm">
              <div className="col-span-6 text-left font-medium text-slate-200 truncate pr-2" title={proc.name}>
                  {proc.name}
                  {PROTECTED_PROCESSES.has(proc.name.toLowerCase()) && (
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px] border border-yellow-500/30">
                      <Shield className="w-3 h-3" /> Korunan
                    </span>
                  )}
              </div>
              <div className="col-span-3 text-right text-slate-500 font-mono">
                {proc.pid}
              </div>
              <div className="col-span-3 text-right flex items-center justify-end gap-3">
                <span className="text-slate-400 text-xs">{(proc.memory / 1024 / 1024).toFixed(0)} MB</span>
                <button
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition disabled:opacity-50"
                  title="Kill Process"
                  onClick={() => {
                    if (PROTECTED_PROCESSES.has(proc.name.toLowerCase())) {
                      alert('Bu işlem sistem tarafından korunuyor')
                      return
                    }
                    alert('Kill işlemi Dashboard’dan sınırlandırıldı; Agent tarafı kritik süreçleri engeller')
                  }}
                  disabled={PROTECTED_PROCESSES.has(proc.name.toLowerCase())}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-8 text-center text-slate-500">No processes</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
