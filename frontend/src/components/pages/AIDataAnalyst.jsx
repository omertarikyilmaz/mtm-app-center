import { useState, useRef } from 'react'
import { FileText, Loader2, AlertCircle, Download, BarChart3, HelpCircle } from 'lucide-react'

export default function AIDataAnalyst() {
    const [excelFile, setExcelFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [taskId, setTaskId] = useState(null)
    const [status, setStatus] = useState(null)
    const [error, setError] = useState(null)
    const [apiKey, setApiKey] = useState('')
    const [model, setModel] = useState('gpt-4-turbo-preview')
    const [showDocs, setShowDocs] = useState(false)
    const fileInputRef = useRef(null)

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setExcelFile(file)
            setStatus(null)
            setError(null)
            setTaskId(null)
        }
    }

    const handleProcess = async () => {
        if (!excelFile || !apiKey) {
            setError('Lütfen dosya ve API key giriniz')
            return
        }

        setLoading(true)
        setError(null)
        setStatus(null)

        const formData = new FormData()
        formData.append('file', excelFile)
        formData.append('api_key', apiKey)
        formData.append('model', model)

        try {
            const response = await fetch('/api/v1/ai-analyst/analyze', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.detail || `Server hatası: ${response.status}`)
            }

            const data = await response.json()
            setTaskId(data.task_id)

            // Start polling for status
            pollStatus(data.task_id)
        } catch (err) {
            console.error('Error:', err)
            setError(err.message)
            setLoading(false)
        }
    }

    const pollStatus = async (id) => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`/api/v1/ai-analyst/status/${id}`)
                if (!response.ok) throw new Error('Status check failed')

                const data = await response.json()
                setStatus(data)

                if (data.status === 'completed' || data.status === 'failed') {
                    clearInterval(interval)
                    setLoading(false)
                    if (data.status === 'failed') {
                        setError(data.error || 'İşlem başarısız oldu')
                    }
                }
            } catch (err) {
                console.error('Polling error:', err)
            }
        }, 2000) // Poll every 2 seconds
    }

    const handleDownload = async () => {
        if (!taskId) return

        try {
            const response = await fetch(`/api/v1/ai-analyst/download/${taskId}`)
            if (!response.ok) throw new Error('Download failed')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `ai_analysis_${taskId}.xlsx`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (err) {
            setError('İndirme başarısız: ' + err.message)
        }
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
            {/* Help button */}
            <button
                onClick={() => setShowDocs(!showDocs)}
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 1rem',
                    color: '#8b5cf6',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 500
                }}
            >
                <HelpCircle size={18} /> Nasıl Kullanırım?
            </button>

            {/* Help Modal */}
            {showDocs && (
                <>
                    <div onClick={() => setShowDocs(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1999 }} />
                    <div style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'var(--bg-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        width: '90%',
                        maxWidth: '700px',
                        maxHeight: '85vh',
                        overflow: 'auto',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        zIndex: 2000
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6' }}>📖 AI Data Analyst Kullanım Kılavuzu</h2>
                            <button onClick={() => setShowDocs(false)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', color: '#8b5cf6' }}>×</button>
                        </div>
                        <div style={{ lineHeight: '1.8', fontSize: '0.95rem' }}>
                            <h3 style={{ color: '#8b5cf6', marginBottom: '0.5rem' }}>🎯 Ne İşe Yarar?</h3>
                            <p>Excel tablosundaki GNO linklerinden haber metinlerini çıkarır, <strong>marka analizi ve sentiment analizi</strong> yapar.</p>

                            <h3 style={{ color: '#8b5cf6', marginTop: '1.5rem', marginBottom: '0.5rem' }}>📋 Adım Adım Kullanım:</h3>
                            <ol style={{ paddingLeft: '1.5rem' }}>
                                <li><strong>OpenAI API Key</strong> girin</li>
                                <li><strong>Model seçin</strong> (GPT-4 veya GPT-3.5)</li>
                                <li><strong>Excel dosyası</strong> yükleyin (GNO veya Gno kolonlu)</li>
                                <li><strong>"Analizi Başlat"</strong> butonuna tıklayın</li>
                                <li>İşlem bitince <strong>Excel indir</strong></li>
                            </ol>

                            <h3 style={{ color: '#8b5cf6', marginTop: '1.5rem', marginBottom: '0.5rem' }}>📊 Excel Formatı:</h3>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                <li><strong>Girdi:</strong> "GNO" veya "Gno" kolonunda URL'ler</li>
                                <li><strong>Çıktı:</strong> GNO, Marka, Headline, Category, Sentiment, Mention Weight, Control</li>
                            </ul>

                            <h3 style={{ color: '#8b5cf6', marginTop: '1.5rem', marginBottom: '0.5rem' }}>⚙️ Analiz Bilgileri:</h3>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                <li><strong>Marka:</strong> Haberdeki şirket/marka adı</li>
                                <li><strong>Headline:</strong> Max 7 kelime özet</li>
                                <li><strong>Category:</strong> B2B, CORP, PROD, SERV, EVENT, CSR</li>
                                <li><strong>Sentiment:</strong> Olumlu, Olumsuz, Nötr</li>
                                <li><strong>Mention Weight:</strong> Yüksek/Dengeli/Kısa Bahis</li>
                                <li><strong>Control:</strong> Kontrollü/Kontrolsüz</li>
                            </ul>

                            <h3 style={{ color: '#8b5cf6', marginTop: '1.5rem', marginBottom: '0.5rem' }}>💡 İpuçları:</h3>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                <li>Her GNO için 60 saniye timeout var</li>
                                <li>Büyük tablolar uzun sürebilir (progress bar izleyin)</li>
                                <li>GPT-4 daha doğru, GPT-3.5 daha hızlı ve ucuz</li>
                            </ul>
                        </div>
                    </div>
                </>
            )}

            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <BarChart3 size={32} color="#8b5cf6" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>AI Data Analyst</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Haber metinlerinden marka ve sentiment analizi</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Left Column - Input */}
                <div>
                    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#8b5cf6' }}>
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

                    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#8b5cf6' }}>
                            Model Seçimi
                        </label>
                        <select
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.5rem',
                                color: 'var(--text-primary)',
                                fontSize: '0.9rem'
                            }}
                        >
                            <option value="gpt-4-turbo-preview">GPT-4 Turbo (Daha Doğru)</option>
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Daha Hızlı)</option>
                        </select>
                    </div>

                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1.5rem' }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".xlsx,.xls,.csv"
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
                                <FileText size={48} color="#8b5cf6" style={{ margin: '0 auto 1rem' }} />
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Excel/CSV dosyası yükleyin</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>GNO kolonlu tablo gerekli</p>
                            </>
                        )}
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginBottom: '1rem', background: '#8b5cf6', borderColor: '#8b5cf6' }}
                        disabled={!excelFile || loading || !apiKey}
                        onClick={handleProcess}
                    >
                        {loading ? <><Loader2 className="loading-spinner" size={20} /> İşleniyor...</> : 'Analizi Başlat'}
                    </button>

                    {status?.status === 'completed' && (
                        <button
                            className="btn btn-secondary"
                            style={{ width: '100%', background: '#10b981', color: 'white' }}
                            onClick={handleDownload}
                        >
                            <Download size={18} /> Excel Olarak İndir
                        </button>
                    )}
                </div>

                {/* Right Column - Status */}
                <div className="glass-panel" style={{ padding: '2rem', maxHeight: '800px', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Durum</h3>

                    {error && (
                        <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}

                    {loading && status && (
                        <div style={{ padding: '1rem' }}>
                            {/* Progress bar */}
                            {status.total > 0 && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 600, color: '#8b5cf6' }}>
                                                {status.progress} / {status.total}
                                            </span>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                {Math.round((status.progress / status.total) * 100)}%
                                            </span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', background: 'var(--surface-color)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${(status.progress / status.total) * 100}%`,
                                                height: '100%',
                                                background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                                                transition: 'width 0.3s ease'
                                            }}></div>
                                        </div>
                                    </div>

                                    {/* Current status */}
                                    <div style={{
                                        padding: '1rem',
                                        background: 'rgba(139, 92, 246, 0.05)',
                                        borderRadius: '0.5rem',
                                        border: '1px solid rgba(139, 92, 246, 0.2)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Loader2 className="loading-spinner" size={16} />
                                            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                                                {status.message}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {status?.status === 'completed' && (
                        <div style={{
                            padding: '1.5rem',
                            background: 'rgba(16, 185, 129, 0.1)',
                            borderRadius: '0.5rem',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <span style={{ fontWeight: 600, color: '#10b981', fontSize: '1.1rem' }}>Analiz Tamamlandı!</span>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{status.message}</p>
                        </div>
                    )}

                    {!loading && !status && !error && (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                            <p>Analiz başlatmak için dosya yükleyin ve "Analizi Başlat" butonuna tıklayın.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
