import { useState, useRef } from 'react'
import { Upload, Code, MessageSquare, ScanText, FileText, Loader2, AlertCircle, CheckCircle, Users } from 'lucide-react'
import Documentation from './Documentation'
import './index.css'

function App() {
    const [currentView, setCurrentView] = useState('dashboard')

    return (
        <div style={{ minHeight: '100vh', padding: '2rem' }}>
            <header style={{ marginBottom: '3rem', maxWidth: '1400px', margin: '0 auto 3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    MTM App Center
                </h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>DeepSeek OCR, Local LLM ve Pipeline Servisleri</p>
            </header>

            {currentView === 'dashboard' ? (
                <Dashboard onViewChange={setCurrentView} />
            ) : currentView === 'ocr' ? (
                <OCRInterface />
            ) : currentView === 'pipelines' ? (
                <IflasOCRInterface />
            ) : currentView === 'kunye' ? (
                <KunyeInterface />
            ) : currentView === 'chat' ? (
                <ChatInterface />
            ) : currentView === 'documentation' ? (
                <Documentation />
            ) : null}

            {currentView !== 'dashboard' && (
                <button
                    className="btn btn-secondary"
                    style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onClick={() => setCurrentView('dashboard')}
                >
                    ← Ana Sayfaya Dön
                </button>
            )}
        </div>
    )
}

function Dashboard({ onViewChange }) {
    const apps = [
        {
            id: 'ocr',
            name: 'DeepSeek OCR',
            description: 'DeepSeek-V2 ve vLLM destekli gelişmiş optik karakter tanıma servisi.',
            icon: <ScanText size={32} color="#6366f1" />,
            status: 'Aktif'
        },
        {
            id: 'pipelines',
            name: 'OpenAI İflas OCR',
            description: 'Gazete ilanlarından yapılandırılmış iflas/icra verisi çıkarımı - GPT-4 destekli.',
            icon: <Code size={32} color="#f59e0b" />,
            status: 'Beta'
        },
        {
            id: 'kunye',
            name: 'MBR Künye Pipeline',
            description: 'Gazete/Dergi künyelerinden yayın ve çalışan bilgilerini ayrıştırır.',
            icon: <Users size={32} color="#ec4899" />,
            status: 'Yeni'
        },
        {
            id: 'chat',
            name: 'Local Turkish-Gemma LLM',
            description: 'YTÜ COSMOS Turkish-Gemma-9b-T1 modeli - Türkçe\'ye özel eğitilmiş, akıllı reasoning asistanı.',
            icon: <MessageSquare size={32} color="#94a3b8" />,
            status: 'Hizmet Dışı',
            disabled: true
        },
    ]

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {apps.map((app) => (
                    <div
                        key={app.id}
                        className="glass-panel"
                        style={{
                            padding: '2rem',
                            cursor: app.disabled ? 'not-allowed' : 'pointer',
                            opacity: app.disabled ? 0.6 : 1,
                            transition: 'all 0.2s'
                        }}
                        onClick={() => !app.disabled && onViewChange(app.id)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ background: 'var(--surface-color)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                                {app.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>{app.name}</h3>
                                <span style={{
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '1rem',
                                    background: app.status === 'Aktif' ? 'rgba(16, 185, 129, 0.1)' : app.status === 'Beta' ? 'rgba(245, 158, 11, 0.1)' : app.status === 'Yeni' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: app.status === 'Aktif' ? '#10b981' : app.status === 'Beta' ? '#f59e0b' : app.status === 'Yeni' ? '#ec4899' : '#ef4444',
                                    fontWeight: 600
                                }}>
                                    {app.status}
                                </span>
                            </div>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{app.description}</p>
                    </div>
                ))}

                <div
                    className="glass-panel"
                    style={{ padding: '2rem', cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => onViewChange('documentation')}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ background: 'var(--surface-color)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                            <FileText size={32} color="#8b5cf6" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>API Dokümantasyonu</h3>
                        </div>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>Tüm servislerin API kullanımı, endpoint'ler ve örnekler</p>
                </div>
            </div>
        </div>
    )
}

// ... OCRInterface ...

function KunyeInterface() {
    const [excelFile, setExcelFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState(null)
    const [error, setError] = useState(null)
    const [apiKey, setApiKey] = useState('')
    const [useBatchAPI, setUseBatchAPI] = useState(false)
    const [showDocs, setShowDocs] = useState(false)
    const fileInputRef = useRef(null)

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setExcelFile(file)
            setResults(null)
            setError(null)
        }
    }

    const handleProcess = async () => {
        if (!excelFile) return
        if (!apiKey || apiKey.trim() === '') {
            setError('Lütfen OpenAI API Key giriniz')
            return
        }

        setLoading(true)
        setError(null)
        setResults(null)

        const formData = new FormData()
        formData.append('file', excelFile)
        formData.append('openai_api_key', apiKey)
        formData.append('id_column', 'A')

        try {
            // Choose endpoint based on batch mode
            const endpoint = useBatchAPI
                ? '/api/v1/pipelines/mbr-kunye-batch-hybrid'
                : '/api/v1/pipelines/mbr-kunye-batch'

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.detail || `Server hatası: ${response.status}`)
            }

            const data = await response.json()

            if (useBatchAPI) {
                // Batch mode: show batch ID
                setResults({
                    _isBatch: true,
                    batch_id: data.batch_id,
                    status: data.status,
                    message: data.message,
                    ocr_count: data.ocr_results?.filter(r => !r.error).length || 0
                })
            } else {
                // Normal mode: show results
                setResults(data)
            }
        } catch (err) {
            console.error('Error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const exportToExcel = () => {
        if (!results || !results.results) return

        const headers = [
            'Satır No', 'Clip ID', 'Durum',
            'Yayın Adı', 'Yayın Grubu', 'Adres', 'Telefon', 'Faks', 'Email', 'Web Sitesi',
            'Kişi Adı', 'Görevi', 'Kişi Telefon', 'Kişi Email',
            'Notlar', 'Ham OCR Metni', 'Hata'
        ]

        const rows = []

        results.results.forEach(r => {
            const commonData = [
                r.row,
                r.clip_id,
                r.status === 'success' ? 'Başarılı' : 'Hata',
                r.data?.yayin_adi || '',
                r.data?.yayin_grubu || '',
                r.data?.adres || '',
                r.data?.telefon || '',
                r.data?.faks || '',
                r.data?.email || '',
                r.data?.web_sitesi || ''
            ]

            const extraData = [
                r.data?.notlar || '',
                r.raw_ocr_text || '',
                r.error || ''
            ]

            if (r.data?.kisiler && r.data.kisiler.length > 0) {
                // Create a row for each person
                r.data.kisiler.forEach(kisi => {
                    rows.push([
                        ...commonData,
                        kisi.ad_soyad || '',
                        kisi.gorev || '',
                        kisi.telefon || '',
                        kisi.email || '',
                        ...extraData
                    ])
                })
            } else {
                // No people found, just add one row with empty person fields
                rows.push([
                    ...commonData,
                    '', '', '', '', // Empty person fields
                    ...extraData
                ])
            }
        })

        const ws_data = [headers, ...rows]
        const ws = window.XLSX.utils.aoa_to_sheet(ws_data)
        const wb = window.XLSX.utils.book_new()
        window.XLSX.utils.book_append_sheet(wb, ws, 'Künye Sonuçları')
        window.XLSX.writeFile(wb, `mbr_kunye_sonuclari_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
            {/* Documentation button - top right */}
            <button
                onClick={() => setShowDocs(!showDocs)}
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: 'rgba(236, 72, 153, 0.1)',
                    border: '1px solid rgba(236, 72, 153, 0.3)',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 1rem',
                    color: '#ec4899',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}
            >
                <span>📖</span> API Dokümantasyonu
            </button>

            {/* Documentation modal/dropdown */}
            {showDocs && (
                <div style={{
                    position: 'absolute',
                    top: '3rem',
                    right: 0,
                    background: 'var(--surface-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    width: '400px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                    zIndex: 1000,
                    fontSize: '0.85rem',
                    lineHeight: '1.6'
                }}>
                    <h3 style={{ marginTop: 0, color: '#ec4899' }}>Batch API Modu</h3>
                    <p><strong>Normal Mod:</strong> Hızlı, anında sonuç (pahalı)</p>
                    <p><strong>Batch API Modu:</strong> %50 daha ucuz ama 5-30 dakika beklersiniz</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Batch modu geceleyin büyük işler için idealdir. İşlem sonrası Batch ID alırsınız.
                    </p>
                    <button
                        onClick={() => setShowDocs(false)}
                        style={{
                            marginTop: '1rem',
                            background: '#ec4899',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        Anladım
                    </button>
                </div>
            )}

            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(236, 72, 153, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <Users size={32} color="#ec4899" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>MBR Künye Pipeline</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Gazete/Dergi künyelerinden yayın ve çalışan bilgilerini ayrıştırır.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Left Column */}
                <div>
                    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#ec4899' }}>
                            OpenAI API Key *
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-proj-..."
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.5rem',
                                color: 'var(--text-primary)',
                                fontSize: '0.9rem'
                            }}
                        />

                        {/* Batch API Toggle */}
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginTop: '1rem',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}>
                            <input
                                type="checkbox"
                                checked={useBatchAPI}
                                onChange={(e) => setUseBatchAPI(e.target.checked)}
                                style={{ cursor: 'pointer' }}
                            />
                            <span>Batch API kullan (💰 %50 ucuz, ⏰ 5-30 dk)</span>
                        </label>
                    </div>

                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1.5rem' }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".xlsx,.xls"
                            style={{ display: 'none' }}
                        />

                        {excelFile ? (
                            <div>
                                <FileText size={48} color="#10b981" style={{ margin: '0 auto 1rem' }} />
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{excelFile.name}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Dosya yüklendi</p>
                            </div>
                        ) : (
                            <>
                                <FileText size={48} color="#ec4899" style={{ margin: '0 auto 1rem' }} />
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Excel dosyası yükleyin</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>İlk kolondan clip ID'leri okunacak</p>
                            </>
                        )}
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginBottom: '1rem', background: '#ec4899', borderColor: '#ec4899' }}
                        disabled={!excelFile || loading || !apiKey}
                        onClick={handleProcess}
                    >
                        {loading ? <><Loader2 className="loading-spinner" size={20} /> İşleniyor...</> : 'Toplu İşle'}
                    </button>

                    {results && (
                        <button
                            className="btn btn-secondary"
                            style={{ width: '100%', background: '#10b981', color: 'white' }}
                            onClick={exportToExcel}
                        >
                            <FileText size={18} /> Excel Olarak İndir
                        </button>
                    )}
                </div>

                {/* Right Column - Results */}
                <div className="glass-panel" style={{ padding: '2rem', maxHeight: '800px', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Sonuçlar</h3>

                    {loading && (
                        <div style={{ padding: '2rem' }}>
                            {/* Progress bar and current status */}
                            {results?._progress && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 600, color: '#ec4899' }}>
                                                {results._progress.current} / {results._progress.total}
                                            </span>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                {Math.round((results._progress.current / results._progress.total) * 100)}%
                                            </span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', background: 'var(--surface-color)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${(results._progress.current / results._progress.total) * 100}%`,
                                                height: '100%',
                                                background: 'linear-gradient(90deg, #ec4899, #f472b6)',
                                                transition: 'width 0.3s ease'
                                            }}></div>
                                        </div>
                                    </div>

                                    {/* Current item being processed */}
                                    <div style={{
                                        padding: '1rem',
                                        background: 'rgba(236, 72, 153, 0.05)',
                                        borderRadius: '0.5rem',
                                        border: '1px solid rgba(236, 72, 153, 0.2)'
                                    }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                            Clip ID: <strong>{results._progress.clip_id}</strong>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Loader2 className="loading-spinner" size={16} />
                                            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                                                {results._progress.step === 'url' && '🔗 URL Oluşturuluyor'}
                                                {results._progress.step === 'download' && '⬇️ Görsel İndiriliyor'}
                                                {results._progress.step === 'ocr' && '🔍 OCR İşleniyor'}
                                                {results._progress.step === 'ai' && '🤖 AI Analiz Ediyor'}
                                            </span>
                                        </div>
                                        {results._progress.message && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                                {results._progress.message}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Spinner if no progress yet */}
                            {!results?._progress && (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                    <Loader2 className="loading-spinner" size={32} />
                                    <p style={{ marginTop: '1rem' }}>Başlatılıyor...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}

                    {results && (
                        <div>
                            {/* Summary */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6366f1' }}>{results.total}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Toplam</div>
                                </div>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{results.successful}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Başarılı</div>
                                </div>
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{results.failed}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hata</div>
                                </div>
                                <div style={{ background: 'rgba(236, 72, 153, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ec4899' }}>{results.processed}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>İşlenen</div>
                                </div>
                            </div>

                            {/* Results Preview */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {results.results.slice(0, 10).map((result, idx) => (
                                    <div key={idx} style={{
                                        background: result.status === 'success' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                        borderRadius: '0.5rem',
                                        padding: '1rem',
                                        border: `1px solid ${result.status === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 600 }}>#{result.row} - {result.clip_id}</span>
                                            <span style={{
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '0.25rem',
                                                fontSize: '0.75rem',
                                                background: result.status === 'success' ? '#10b981' : '#ef4444',
                                                color: 'white'
                                            }}>
                                                {result.status === 'success' ? 'Başarılı' : 'Hata'}
                                            </span>
                                        </div>
                                        {result.status === 'success' ? (
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{result.data?.yayin_adi}</div>
                                                {result.data?.kisiler && (
                                                    <div style={{ marginTop: '0.5rem' }}>
                                                        {result.data.kisiler.length} kişi bulundu:
                                                        <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
                                                            {result.data.kisiler.slice(0, 3).map((k, i) => (
                                                                <li key={i}>{k.ad_soyad} ({k.gorev})</li>
                                                            ))}
                                                            {result.data.kisiler.length > 3 && <li>...</li>}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '0.85rem', color: '#ef4444' }}>
                                                {result.error}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function IflasOCRInterface() {
    const [activeTab, setActiveTab] = useState('image')

    // Image upload states
    const [files, setFiles] = useState([])
    const [previews, setPreviews] = useState([])
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState(null)
    const [error, setError] = useState(null)
    const [apiKey, setApiKey] = useState('')
    const fileInputRef = useRef(null)

    // Excel batch states
    const [excelFile, setExcelFile] = useState(null)
    const [excelLoading, setExcelLoading] = useState(false)
    const [excelResults, setExcelResults] = useState(null)
    const [excelError, setExcelError] = useState(null)
    const excelInputRef = useRef(null)

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files)
        if (selectedFiles.length > 0) {
            setFiles(selectedFiles)
            setPreviews(selectedFiles.map(f => URL.createObjectURL(f)))
            setResults(null)
            setError(null)
        }
    }

    const handleProcess = async () => {
        if (files.length === 0) return
        if (!apiKey || apiKey.trim() === '') {
            setError('Lütfen OpenAI API Key giriniz')
            return
        }

        setLoading(true)
        setError(null)

        const formData = new FormData()
        files.forEach(file => {
            formData.append('files', file)
        })
        formData.append('openai_api_key', apiKey)

        try {
            const response = await fetch('/api/v1/pipelines/iflas-ocr', {
                method: 'POST',
                body: formData,
            })

            const responseText = await response.text()
            let data

            try {
                data = JSON.parse(responseText)
            } catch (e) {
                console.error('Non-JSON response:', responseText)
                throw new Error(`Sunucu hatası (${response.status}): ${responseText.substring(0, 100)}...`)
            }

            if (!response.ok) {
                throw new Error(data.detail || 'İşlem başarısız oldu')
            }

            setResults(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleExcelChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setExcelFile(file)
            setExcelResults(null)
            setExcelError(null)
        }
    }

    const handleExcelProcess = async () => {
        if (!excelFile) return
        if (!apiKey || apiKey.trim() === '') {
            setExcelError('Lütfen OpenAI API Key giriniz')
            return
        }

        setExcelLoading(true)
        setExcelError(null)

        const formData = new FormData()
        formData.append('file', excelFile)
        formData.append('openai_api_key', apiKey)
        formData.append('id_column', 'A')

        try {
            const response = await fetch('/api/v1/pipelines/iflas-ocr-batch', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                // Try to get error message from response
                let errorMsg = 'İşlem başarısız oldu'
                try {
                    const errorData = await response.json()
                    errorMsg = errorData.detail || errorMsg
                } catch {
                    // If JSON parse fails, use status text
                    errorMsg = `Server hatası: ${response.status} ${response.statusText}`
                }
                throw new Error(errorMsg)
            }

            const data = await response.json()
            setExcelResults(data)
        } catch (err) {
            setExcelError(err.message)
        } finally {
            setExcelLoading(false)
        }
    }

    const exportToExcel = () => {
        if (!excelResults || !excelResults.results) return

        // Match columns exactly as requested by user
        const headers = [
            "AD SOYAD / UNVAN", "TCKN / YKN", "VKN", "ADRES",
            "İCRA/İFLAS MÜDÜRLÜĞÜ", "İLAN TÜRÜ", "DOSYA YILI", "TARİH",
            "1. DAVACI", "2. DAVACI", "3. DAVACI", "4. DAVACI", "5. DAVACI", "6. DAVACI", "7. DAVACI",
            "DOSYA NO", "BİLGİ KAYNAĞI"
        ]

        const rows = excelResults.results.map(r => [
            r.data?.ad_soyad_unvan || '',
            r.data?.tckn || '',
            r.data?.vkn || '',
            r.data?.adres || '',
            r.data?.icra_iflas_mudurlugu || '',
            r.data?.ilan_turu || '',
            r.data?.dosya_yili || '',
            r.data?.ilan_tarihi || '',
            r.data?.davaci_1 || '',
            r.data?.davaci_2 || '',
            r.data?.davaci_3 || '',
            r.data?.davaci_4 || '',
            r.data?.davaci_5 || '',
            r.data?.davaci_6 || '',
            r.data?.davaci_7 || '',
            r.data?.dosya_no || '',
            r.data?.kaynak || ''
        ])

        // Create Excel file using SheetJS (XLSX)
        const ws_data = [headers, ...rows]
        const ws = window.XLSX.utils.aoa_to_sheet(ws_data)
        const wb = window.XLSX.utils.book_new()
        window.XLSX.utils.book_append_sheet(wb, ws, 'İflas OCR Sonuçları')

        // Generate Excel file
        window.XLSX.writeFile(wb, `iflas_ocr_sonuclari_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <Code size={32} color="#f59e0b" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>OpenAI İflas OCR Pipeline</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Gazete ilanlarından yapılandırılmış iflas/icra verisi çıkarın - GPT-4 destekli</p>
                </div>
            </div>

            {/* Tab Selector */}
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', borderBottom: '2px solid var(--border-color)' }}>
                <button
                    className={`btn ${activeTab === 'image' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('image')}
                    style={{
                        borderRadius: '0.5rem 0.5rem 0 0',
                        borderBottom: activeTab === 'image' ? '2px solid #f59e0b' : 'none',
                        marginBottom: '-2px'
                    }}
                >
                    <Upload size={18} /> Görsel Yükleme
                </button>
                <button
                    className={`btn ${activeTab === 'excel' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('excel')}
                    style={{
                        borderRadius: '0.5rem 0.5rem 0 0',
                        borderBottom: activeTab === 'excel' ? '2px solid #f59e0b' : 'none',
                        marginBottom: '-2px'
                    }}
                >
                    <FileText size={18} /> Excel Toplu İşleme
                </button>
            </div>

            {/* Image Upload Tab */}
            {activeTab === 'image' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    {/* Left Column */}
                    <div>
                        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#f59e0b' }}>
                                OpenAI API Key *
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-proj-..."
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '0.5rem',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem'
                                }}
                            />
                            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                API key'iniz sadece bu istek için kullanılır. <a href="https://platform.openai.com/api-keys" target="_blank" style={{ color: '#f59e0b' }}>Buradan alabilirsiniz</a>
                            </p>
                        </div>

                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1.5rem' }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                multiple
                                style={{ display: 'none' }}
                            />

                            {previews.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
                                    {previews.map((preview, idx) => (
                                        <img key={idx} src={preview} alt={`Preview ${idx}`} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '0.5rem' }} />
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <Upload size={48} color="#f59e0b" style={{ margin: '0 auto 1rem' }} />
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Gazete ilanı görsellerini yükleyin</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Birden fazla dosya seçebilirsiniz</p>
                                </>
                            )}
                        </div>

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            disabled={files.length === 0 || loading || !apiKey}
                            onClick={handleProcess}
                        >
                            {loading ? <><Loader2 className="loading-spinner" size={20} /> İşleniyor...</> : 'Verileri Çıkart'}
                        </button>
                    </div>

                    {/* Right Column - Results */}
                    <div className="glass-panel" style={{ padding: '2rem', maxHeight: '800px', overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Sonuçlar</h3>

                        {loading && (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                <Loader2 className="loading-spinner" size={32} />
                                <p style={{ marginTop: '1rem' }}>Veriler analiz ediliyor...</p>
                            </div>
                        )}

                        {error && (
                            <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        )}

                        {results && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {results.map((result, idx) => (
                                    <div key={idx} style={{ background: 'var(--surface-color)', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                                            <div><strong>Ad/Soyad/Ünvan:</strong> {result.ad_soyad_unvan || 'N/A'}</div>
                                            <div><strong>TCKN:</strong> {result.tckn || 'N/A'}</div>
                                            <div><strong>VKN:</strong> {result.vkn || 'N/A'}</div>
                                            <div><strong>İlan Türü:</strong> {result.ilan_turu || 'N/A'}</div>
                                            <div style={{ gridColumn: '1 / -1' }}><strong>Adres:</strong> {result.adres || 'N/A'}</div>
                                            <div style={{ gridColumn: '1 / -1' }}><strong>İcra/İflas Müdürlüğü:</strong> {result.icra_iflas_mudurlugu || 'N/A'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Excel Batch Tab */}
            {activeTab === 'excel' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    {/* Left Column */}
                    <div>
                        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#f59e0b' }}>
                                OpenAI API Key *
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-proj-..."
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '0.5rem',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>

                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1.5rem' }}
                            onClick={() => excelInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={excelInputRef}
                                onChange={handleExcelChange}
                                accept=".xlsx,.xls"
                                style={{ display: 'none' }}
                            />

                            {excelFile ? (
                                <div>
                                    <FileText size={48} color="#10b981" style={{ margin: '0 auto 1rem' }} />
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{excelFile.name}</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Dosya yüklendi</p>
                                </div>
                            ) : (
                                <>
                                    <FileText size={48} color="#f59e0b" style={{ margin: '0 auto 1rem' }} />
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Excel dosyası yükleyin</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>İlk kolondan clip ID'leri okunacak</p>
                                </>
                            )}
                        </div>

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', marginBottom: '1rem' }}
                            disabled={!excelFile || excelLoading || !apiKey}
                            onClick={handleExcelProcess}
                        >
                            {excelLoading ? <><Loader2 className="loading-spinner" size={20} /> İşleniyor...</> : 'Toplu İşle'}
                        </button>

                        {excelResults && (
                            <button
                                className="btn btn-secondary"
                                style={{ width: '100%', background: '#10b981', color: 'white' }}
                                onClick={exportToExcel}
                            >
                                <FileText size={18} /> Excel Olarak İndir
                            </button>
                        )}
                    </div>

                    {/* Right Column - Results */}
                    <div className="glass-panel" style={{ padding: '2rem', maxHeight: '800px', overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Sonuçlar</h3>

                        {excelLoading && (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                <Loader2 className="loading-spinner" size={32} />
                                <p style={{ marginTop: '1rem' }}>Clip'ler işleniyor...</p>
                            </div>
                        )}

                        {excelError && (
                            <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>
                                <AlertCircle size={20} />
                                {excelError}
                            </div>
                        )}

                        {excelResults && (
                            <div>
                                {/* Summary */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6366f1' }}>{excelResults.total}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Toplam</div>
                                    </div>
                                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{excelResults.successful}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Başarılı</div>
                                    </div>
                                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{excelResults.failed}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hata</div>
                                    </div>
                                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{excelResults.processed}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>İşlenen</div>
                                    </div>
                                </div>

                                {/* Results Preview */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {excelResults.results.slice(0, 10).map((result, idx) => (
                                        <div key={idx} style={{
                                            background: result.status === 'success' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                            borderRadius: '0.5rem',
                                            padding: '1rem',
                                            border: `1px solid ${result.status === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: 600 }}>#{result.row} - {result.clip_id}</span>
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '0.25rem',
                                                    fontSize: '0.75rem',
                                                    background: result.status === 'success' ? '#10b981' : '#ef4444',
                                                    color: 'white'
                                                }}>
                                                    {result.status === 'success' ? 'Başarılı' : 'Hata'}
                                                </span>
                                            </div>
                                            {result.status === 'success' ? (
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    {result.data?.ad_soyad_unvan && <div>• {result.data.ad_soyad_unvan}</div>}
                                                    {result.data?.ilan_turu && <div>• {result.data.ilan_turu}</div>}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '0.85rem', color: '#ef4444' }}>
                                                    {result.error}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {excelResults.results.length > 10 && (
                                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            ... ve {excelResults.results.length - 10} sonuç daha (Excel'i indirin)
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

function ChatInterface() {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Merhaba! Ben Turkish-Gemma asistanıyım. Size nasıl yardımcı olabilirim?'
        }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)

    return (
        <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(148, 163, 184, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <MessageSquare size={32} color="#94a3b8" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Local Turkish-Gemma LLM</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Türkçe'ye özel eğitilmiş akıllı asistan (Hizmet Dışı)</p>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '2rem' }}>
                    <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem' }}>
                        Bu servis şu anda aktif değil.
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
