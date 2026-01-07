'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
    Folder, FileText, ArrowLeft, Home, Download, Trash2,
    ChevronRight, RefreshCw, Loader2, File, Image as ImageIcon,
    Music, Video, Code
} from 'lucide-react';

export default function FileExplorerPage() {
    const params = useParams(); // { deviceId }
    const searchParams = useSearchParams();
    const router = useRouter();
    const deviceId = params.deviceId as string;
    const initialPath = searchParams.get('path') || '';

    const [currentPath, setCurrentPath] = useState(initialPath);
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [previewBase64, setPreviewBase64] = useState<string | null>(null);
    const [previewMime, setPreviewMime] = useState<string>('application/octet-stream');
    const [videoPoster, setVideoPoster] = useState<string | null>(null);

    const supabase = createClient();

    useEffect(() => {
        fetchFiles(currentPath);
    }, [currentPath]);

    const fetchFiles = async (path: string) => {
        setLoading(true);
        setError(null);
        setFiles([]);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            // 1. Send Command
            await supabase.from('commands').insert({
                device_id: deviceId,
                parent_id: user?.id || '00000000-0000-0000-0000-000000000000',
                command_type: 'list_directory',
                command_data: { payload: path },
                status: 'pending'
            });

            // 2. Poll for Result
            let attempts = 0;
            const maxAttempts = 30;
            const poll = setInterval(async () => {
                attempts++;
                if (attempts > maxAttempts) {
                    clearInterval(poll);
                    setLoading(false);
                    setError('Timeout waiting for file list.');
                    return;
                }

                const { data } = await supabase
                    .from('device_logs')
                    .select('*')
                    .eq('device_id', deviceId)
                    .eq('log_type', 'info')
                    .contains('metadata', { subtype: 'file_list' })
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (data && new Date(data.created_at) > new Date(Date.now() - 40000)) {
                    clearInterval(poll);
                    let content = data.content;
                    if (typeof content === 'string') {
                        try { content = JSON.parse(content); } catch (e) { }
                    }

                    if (content.files) {
                        setFiles(content.files);
                        // Update URL without reload
                        const url = new URL(window.location.href);
                        url.searchParams.set('path', content.current_path);
                        window.history.pushState({}, '', url.toString());

                        if (content.current_path !== currentPath) {
                            // Backend might normalize path (e.g., C:/Users/ -> C:\Users)
                            // Don't loop infinitely, just sync visual state if critically different
                        }
                        setPreviewBase64(null);
                        setSelectedPath(null);
                        setVideoPoster(null);
                    }
                    setLoading(false);
                }
            }, 1000);

        } catch (e: any) {
            console.error(e);
            setError(e.message);
            setLoading(false);
        }
    };

    const handleDownload = async (filePath: string) => {
        setDownloading(filePath);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            await supabase.from('commands').insert({
                device_id: deviceId,
                parent_id: user?.id || '00000000-0000-0000-0000-000000000000',
                command_type: 'get_file',
                command_data: { payload: filePath },
                status: 'pending'
            });

            // Poll for download
            let attempts = 0;
            const maxAttempts = 60; // Larger timeout for file transfer
            const poll = setInterval(async () => {
                attempts++;
                if (attempts > maxAttempts) {
                    clearInterval(poll);
                    setDownloading(null);
                    alert('Download timeout.');
                    return;
                }

                const { data } = await supabase
                    .from('device_logs')
                    .select('*')
                    .eq('device_id', deviceId)
                    .eq('log_type', 'info')
                    .contains('metadata', { subtype: 'file_download' })
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (data && new Date(data.created_at) > new Date(Date.now() - 60000)) {
                    clearInterval(poll);
                    const fileBase64 = data.content;
                    const fileName = data.metadata?.filename || 'downloaded_file';

                    // Trigger Browser Download
                    const link = document.createElement('a');
                    link.href = `data:application/octet-stream;base64,${fileBase64}`;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    setDownloading(null);
                }
            }, 1000);

        } catch (e) {
            console.error(e);
            setDownloading(null);
            alert('Download failed');
        }
    };

    const handleDelete = async (filePath: string) => {
        if (!confirm(`Permanently delete ${filePath}?`)) return;
        // Send delete command logic here (omitted for brevity, can duplicate from DeviceCard)
        // For now, let's focus on navigation and download as requested.
        alert("Delete coming soon to full page explorer.");
    };

    const guessMime = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        if (['txt', 'log'].includes(ext || '')) return 'text/plain';
        if (['md'].includes(ext || '')) return 'text/markdown';
        if (['json'].includes(ext || '')) return 'application/json';
        if (['mp3'].includes(ext || '')) return 'audio/mpeg';
        if (['wav'].includes(ext || '')) return 'audio/wav';
        if (['mp4'].includes(ext || '')) return 'video/mp4';
        if (['pdf'].includes(ext || '')) return 'application/pdf';
        return 'application/octet-stream';
    };

    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext || '')) return <ImageIcon className="w-5 h-5 text-purple-400" />;
        if (['mp3', 'wav', 'ogg'].includes(ext || '')) return <Music className="w-5 h-5 text-pink-400" />;
        if (['mp4', 'mkv', 'avi', 'mov'].includes(ext || '')) return <Video className="w-5 h-5 text-red-400" />;
        if (['js', 'ts', 'py', 'html', 'css', 'json'].includes(ext || '')) return <Code className="w-5 h-5 text-blue-400" />;
        if (['txt', 'md', 'log'].includes(ext || '')) return <FileText className="w-5 h-5 text-slate-400" />;
        return <File className="w-5 h-5 text-slate-500" />;
    };

    return (
        <div className="p-8 max-w-7xl mx-auto text-white min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Folder className="w-6 h-6 text-orange-400" />
                            Remote File Explorer
                        </h1>
                        <p className="text-slate-400 text-sm font-mono mt-1">Device: {deviceId}</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchFiles(currentPath)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
                    title="Refresh"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Breadcrumbs / Path Input */}
            <div className="bg-slate-900/50 border border-white/10 p-4 rounded-xl mb-6 flex items-center gap-2">
                <Home
                    className="w-5 h-5 text-slate-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => setCurrentPath('')} // Go to home/root
                />
                <div className="h-6 w-px bg-white/10 mx-2" />
                <input
                    type="text"
                    value={currentPath}
                    onChange={(e) => setCurrentPath(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchFiles(currentPath)}
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm font-mono text-slate-200 placeholder-slate-600"
                    placeholder="Enter path (e.g. C:\Users)..."
                />
                <button
                    onClick={() => fetchFiles(currentPath)}
                    className="text-xs bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20 transition-colors"
                >
                    Go
                </button>
            </div>

            {/* File List + Preview */}
            <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-7 bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden min-h-[500px]">
                {loading && files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 text-slate-400 gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
                        <p>Fetching files from remote device...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-96 text-red-400 gap-3">
                        <div className="bg-red-500/10 p-4 rounded-full">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <p>{error}</p>
                        <button onClick={() => fetchFiles(currentPath)} className="text-sm underline">Try Again</button>
                    </div>
                ) : files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 text-slate-500 gap-3">
                        <Folder className="w-12 h-12 opacity-20" />
                        <p>Empty Directory</p>
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto">
                    <table className="min-w-[640px] w-full text-left text-sm">
                        <thead className="bg-white/5 text-slate-400 font-medium uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4 w-32">Size</th>
                                <th className="px-6 py-4 w-32 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {/* Parent Dir Link */}
                            {currentPath && (
                                <tr
                                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                                    onClick={() => {
                                        // Simple parent logic
                                        const parts = currentPath.split(/[/\\]/);
                                        parts.pop();
                                        const parent = parts.join('\\') || '/';
                                        setCurrentPath(parent);
                                    }}
                                >
                                    <td className="px-6 py-3 flex items-center gap-3">
                                        <div className="p-2 bg-white/5 rounded-lg text-slate-400">
                                            <Folder className="w-5 h-5" />
                                        </div>
                                        <span className="font-bold text-slate-400">..</span>
                                    </td>
                                    <td className="px-6 py-3 text-slate-500">-</td>
                                    <td className="px-6 py-3"></td>
                                </tr>
                            )}

                            {files.map((file, i) => (
                                <tr
                                    key={i}
                                    className="hover:bg-white/5 transition-colors group"
                                >
                                    <td
                                        className="px-6 py-3 cursor-pointer"
                                        onClick={() => {
                                            if (file.type === 'dir') {
                                                setCurrentPath(file.path);
                                            } else {
                                                setSelectedPath(file.path);
                                                setPreviewBase64(null);
                                                // Fetch preview via get_file
                                                (async () => {
                                                    try {
                                                        const { data: { user } } = await supabase.auth.getUser();
                                                        await supabase.from('commands').insert({
                                                            device_id: deviceId,
                                                            parent_id: user?.id || '00000000-0000-0000-0000-000000000000',
                                                            command_type: 'get_file',
                                                            command_data: { payload: file.path },
                                                            status: 'pending'
                                                        });
                                                        let attempts = 0;
                                                        const maxAttempts = 30;
                                                        const poll = setInterval(async () => {
                                                            attempts++;
                                                            if (attempts > maxAttempts) {
                                                                clearInterval(poll);
                                                                return;
                                                            }
                                                            const { data } = await supabase
                                                                .from('device_logs')
                                                                .select('*')
                                                                .eq('device_id', deviceId)
                                                                .eq('log_type', 'info')
                                                                .contains('metadata', { subtype: 'file_download' })
                                                                .order('created_at', { ascending: false })
                                                                .limit(1)
                                                                .single();
                                                            if (data && new Date(data.created_at) > new Date(Date.now() - 40000)) {
                                                                clearInterval(poll);
                                                                const b64 = data.content as string;
                                                                setPreviewBase64(b64);
                                                                setPreviewMime(guessMime(file.name));
                                                                setVideoPoster(null);
                                                            }
                                                        }, 1000);
                                                    } catch (e) { console.error(e); }
                                                })();
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${file.type === 'dir' ? 'bg-orange-500/10' : 'bg-slate-800'}`}>
                                                {file.type === 'dir' ? (
                                                    <Folder className="w-5 h-5 text-orange-400 fill-orange-400/20" />
                                                ) : getFileIcon(file.name)}
                                            </div>
                                            <span className={file.type === 'dir' ? 'font-semibold text-slate-200' : 'text-slate-300'}>
                                                {file.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-slate-400 font-mono text-xs">
                                        {file.type === 'dir' ? '-' : (file.size / 1024).toFixed(1) + ' KB'}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        {file.type !== 'dir' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDownload(file.path); }}
                                                disabled={!!downloading}
                                                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                                title="Download"
                                            >
                                                {downloading === file.path ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                                ) : (
                                                    <Download className="w-4 h-4" />
                                                )}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                )}
            </div>
            <div className="col-span-12 lg:col-span-5 bg-slate-900/50 border border-white/10 rounded-xl min-h-[500px] p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Ön İzleme</h3>
                {!selectedPath ? (
                    <div className="flex flex-col items-center justify-center h-[420px] text-slate-500 gap-2">
                        <File className="w-10 h-10 opacity-20" />
                        <p>Bir dosya seçin</p>
                    </div>
                ) : previewBase64 ? (
                    previewMime.startsWith('image/') ? (
                        <img
                            alt="preview"
                            className="max-h-[420px] max-w-full rounded-lg border border-white/10"
                            src={`data:${previewMime};base64,${previewBase64}`}
                        />
                    ) : previewMime.startsWith('text/') || previewMime === 'application/json' ? (
                        <div className="bg-black/40 border border-white/10 rounded-lg p-3 font-mono text-xs text-slate-300 max-h-[420px] overflow-auto">
                            {atob(previewBase64)}
                        </div>
                    ) : previewMime === 'application/pdf' ? (
                        <iframe
                            title="pdf-preview"
                            className="w-full h-[420px] rounded-lg border border-white/10 bg-white"
                            src={`data:application/pdf;base64,${previewBase64}`}
                        />
                    ) : previewMime.startsWith('video/') ? (
                        <div className="flex flex-col gap-3">
                            {videoPoster ? (
                                <img alt="video poster" className="max-h-[320px] rounded-lg border border-white/10" src={videoPoster} />
                            ) : (
                                <video
                                    className="max-h-[320px] rounded-lg border border-white/10"
                                    src={`data:${previewMime};base64,${previewBase64}`}
                                    controls
                                    onLoadedMetadata={(e) => {
                                        const v = e.currentTarget
                                        try {
                                            v.currentTime = 0.1
                                            const handler = () => {
                                                const canvas = document.createElement('canvas')
                                                canvas.width = v.videoWidth
                                                canvas.height = v.videoHeight
                                                const ctx = canvas.getContext('2d')
                                                if (ctx) {
                                                    ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
                                                    setVideoPoster(canvas.toDataURL('image/png'))
                                                }
                                                v.removeEventListener('seeked', handler)
                                            }
                                            v.addEventListener('seeked', handler)
                                        } catch {}
                                    }}
                                />
                            )}
                            <a
                                className="text-xs inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg"
                                href={`data:${previewMime};base64,${previewBase64}`}
                                download="video"
                            >
                                Videoyu indir
                            </a>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[420px] text-slate-500 gap-2">
                            <FileText className="w-10 h-10 opacity-20" />
                            <p>Bu dosya türü için hızlı önizleme yok</p>
                        </div>
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center h-[420px] text-slate-400 gap-2">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <p>İçerik yükleniyor...</p>
                    </div>
                )}
            </div>
            </div>
        </div>
    );
}
