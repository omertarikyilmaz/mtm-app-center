import { useState, useRef } from 'react'
import { ScanText, LayoutGrid, ArrowLeft, Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

function App() {
    const [currentView, setCurrentView] = useState('dashboard')

    return (
        <div className="app-wrapper">
            <header style={{ borderBottom: '1px solid var(--border-color)', padding: '1rem 0', background: 'var(--glass-bg)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)' }}>
                <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setCurrentView('dashboard')}>
                        <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '0.5rem', borderRadius: '0.5rem', display: 'flex' }}>
                            <LayoutGrid size={24} color="white" />
                        </div>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em' }}>MTM App Center</h1>
                    </div>
                    {currentView !== 'dashboard' && (
                        <button className="btn btn-secondary" onClick={() => setCurrentView('dashboard')} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                            <ArrowLeft size={16} /> Back to Apps
                        </button>
                    )}
                </div>
            </header>

            <main className="container" style={{ flex: 1, padding: '2rem' }}>
                {currentView === 'dashboard' ? (
                    <Dashboard onViewChange={setCurrentView} />
                ) : (
                    <OCRInterface />
                )}
            </main>
        </div>
    )
}

function Dashboard({ onViewChange }) {
    const apps = [
        {
            id: 'ocr',
            name: 'DeepSeek OCR',
            description: 'Advanced optical character recognition powered by DeepSeek-V2 and vLLM.',
            icon: <ScanText size={32} color="#6366f1" />,
            status: 'Live'
        },
        // Future apps can be added here
    ]

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Explore AI Services
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
                    A centralized hub for testing and interacting with MTM's advanced machine learning pipelines.
                </p>
            </div>

            <div className="grid-layout">
                {apps.map(app => (
                    <div key={app.id} className="glass-panel" style={{ padding: '2rem', transition: 'transform 0.2s', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                        onClick={() => onViewChange(app.id)}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '1rem' }}>
                                {app.icon}
                            </div>
                            <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
                                {app.status}
                            </span>
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>{app.name}</h3>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{app.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function OCRInterface() {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const fileInputRef = useRef(null)

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0]
        if (selectedFile) {
            setFile(selectedFile)
            setPreview(URL.createObjectURL(selectedFile))
            setResult(null)
            setError(null)
        }
    }

    const handleUpload = async () => {
        if (!file) return

        setLoading(true)
        setError(null)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch('/api/v1/ocr', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                throw new Error('OCR processing failed')
            }

            const data = await response.json()
            setResult(data.text)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <ScanText size={32} color="#6366f1" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>DeepSeek OCR</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Upload an image to extract text using the DeepSeek-V2 model.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Upload Section */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <div
                        style={{
                            border: '2px dashed var(--border-color)',
                            borderRadius: '1rem',
                            padding: '3rem 2rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: file ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                        }}
                        onClick={() => fileInputRef.current.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault()
                            const droppedFile = e.dataTransfer.files[0]
                            if (droppedFile && droppedFile.type.startsWith('image/')) {
                                setFile(droppedFile)
                                setPreview(URL.createObjectURL(droppedFile))
                                setResult(null)
                                setError(null)
                            }
                        }}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />

                        {preview ? (
                            <div style={{ position: 'relative' }}>
                                <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                <div style={{ marginTop: '1rem' }}>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{file.name}</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Click to change</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{ background: 'var(--surface-color)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                    <Upload size={32} color="var(--text-secondary)" />
                                </div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Click or drag image</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Supports JPG, PNG, WEBP</p>
                            </>
                        )}
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1.5rem' }}
                        disabled={!file || loading}
                        onClick={handleUpload}
                    >
                        {loading ? <><Loader2 className="loading-spinner" size={20} /> Processing...</> : 'Extract Text'}
                    </button>
                </div>

                {/* Result Section */}
                <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} color="#6366f1" /> Result
                        </h3>
                        {result && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', color: '#10b981' }}>
                                <CheckCircle size={14} /> Completed
                            </span>
                        )}
                    </div>

                    <div style={{
                        flex: 1,
                        background: 'var(--bg-color)',
                        borderRadius: '0.75rem',
                        padding: '1.5rem',
                        overflowY: 'auto',
                        maxHeight: '500px',
                        border: '1px solid var(--border-color)',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        fontSize: '0.9rem',
                        lineHeight: 1.6
                    }}>
                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', gap: '1rem' }}>
                                <Loader2 className="loading-spinner" size={32} />
                                <p>Analyzing document structure...</p>
                            </div>
                        ) : error ? (
                            <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        ) : result ? (
                            result
                        ) : (
                            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4rem' }}>
                                Result will appear here
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
