/**
 * SAMAudioInterface - Audio Source Separation using Meta's SAM-Audio
 * 
 * Features:
 * - Upload audio files up to 65 minutes
 * - Custom text prompts (default: "A news anchor speaking")
 * - Three-track waveform visualization
 * - Download separated audio tracks
 */
import { useState, useRef, useEffect } from 'react'
import { Upload, Loader2, AlertCircle, CheckCircle, Download, Play, Pause, Volume2, VolumeX, Music } from 'lucide-react'

const DEFAULT_PROMPT = "A news anchor speaking"

export default function SAMAudioInterface() {
    const [audioFile, setAudioFile] = useState(null)
    const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
    const [taskId, setTaskId] = useState(null)
    const [status, setStatus] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)
    const fileInputRef = useRef(null)

    // Audio player states
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [mutedTracks, setMutedTracks] = useState({
        original: false,
        isolated: false,
        residual: false
    })

    // Audio refs
    const originalRef = useRef(null)
    const isolatedRef = useRef(null)
    const residualRef = useRef(null)
    const progressInterval = useRef(null)

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            // Check file size (500MB max)
            if (file.size > 500 * 1024 * 1024) {
                setError('Dosya çok büyük. Maksimum 500MB.')
                return
            }
            setAudioFile(file)
            setStatus(null)
            setError(null)
            setTaskId(null)
        }
    }

    const handleSubmit = async () => {
        if (!audioFile) {
            setError('Lütfen bir ses dosyası seçin')
            return
        }

        setLoading(true)
        setError(null)
        setStatus(null)

        const formData = new FormData()
        formData.append('file', audioFile)
        formData.append('prompt', prompt || DEFAULT_PROMPT)

        try {
            const response = await fetch('/api/v1/pipelines/sam-audio/separate', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                const err = await response.json().catch(() => ({}))
                throw new Error(err.detail || `HTTP ${response.status}`)
            }

            const data = await response.json()
            setTaskId(data.task_id)
            setStatus({ status: 'pending', progress: 0, message: 'Task started...' })
        } catch (err) {
            setError(err.message)
            setLoading(false)
        }
    }

    // Poll for status updates
    useEffect(() => {
        if (!taskId) return

        const pollStatus = async () => {
            try {
                const response = await fetch(`/api/v1/pipelines/sam-audio/status/${taskId}`)
                const data = await response.json()
                setStatus(data)

                if (data.status === 'completed' || data.status === 'failed') {
                    setLoading(false)
                    if (data.status === 'failed') {
                        setError(data.error || data.message)
                    }
                }
            } catch (err) {
                console.error('Status poll error:', err)
            }
        }

        const interval = setInterval(pollStatus, 2000)
        pollStatus() // Initial poll

        return () => clearInterval(interval)
    }, [taskId])

    // Audio playback synchronization
    const playAll = () => {
        const audios = [originalRef.current, isolatedRef.current, residualRef.current].filter(Boolean)
        audios.forEach(a => {
            a.currentTime = currentTime
            a.play()
        })
        setIsPlaying(true)
    }

    const pauseAll = () => {
        const audios = [originalRef.current, isolatedRef.current, residualRef.current].filter(Boolean)
        audios.forEach(a => a.pause())
        setIsPlaying(false)
    }

    const togglePlay = () => {
        if (isPlaying) {
            pauseAll()
        } else {
            playAll()
        }
    }

    const handleSeek = (e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const percent = (e.clientX - rect.left) / rect.width
        const time = percent * duration
        setCurrentTime(time)

        const audios = [originalRef.current, isolatedRef.current, residualRef.current].filter(Boolean)
        audios.forEach(a => a.currentTime = time)
    }

    const toggleMute = (track) => {
        setMutedTracks(prev => ({ ...prev, [track]: !prev[track] }))
    }

    // Update current time
    useEffect(() => {
        if (!isPlaying) return

        const interval = setInterval(() => {
            const ref = originalRef.current || isolatedRef.current || residualRef.current
            if (ref) {
                setCurrentTime(ref.currentTime)
                if (ref.currentTime >= ref.duration) {
                    pauseAll()
                }
            }
        }, 100)

        return () => clearInterval(interval)
    }, [isPlaying])

    // Format time as mm:ss
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const downloadTrack = (trackType) => {
        if (!taskId) return
        window.open(`/api/v1/pipelines/sam-audio/download/${taskId}/${trackType}`, '_blank')
    }

    const handleAudioLoaded = (e) => {
        setDuration(e.target.duration)
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <Music size={32} color="#a855f7" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>SAM-Audio Source Separation</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Meta'nın SAM-Audio modeli ile ses kaynağı ayırma</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                {/* Left Column - Upload & Settings */}
                <div>
                    {/* Prompt Input */}
                    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#a855f7' }}>
                            Text Prompt (İzole edilecek ses)
                        </label>
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="A news anchor speaking"
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
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                            Örnek: "A man speaking", "Background music", "Dog barking"
                        </p>
                    </div>

                    {/* File Upload */}
                    <div
                        className="glass-panel"
                        style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1.5rem' }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".wav,.mp3,.ogg,.flac,.m4a,.aac"
                            style={{ display: 'none' }}
                        />
                        <Upload size={48} color="#a855f7" style={{ margin: '0 auto 1rem' }} />
                        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                            {audioFile ? audioFile.name : 'Ses Dosyası Yükle'}
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            WAV, MP3, OGG, FLAC (Max 65 dakika)
                        </p>
                    </div>

                    {/* Submit Button */}
                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', background: '#a855f7', borderColor: '#a855f7' }}
                        onClick={handleSubmit}
                        disabled={!audioFile || loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="loading-spinner" size={18} />
                                İşleniyor...
                            </>
                        ) : (
                            <>
                                <Music size={18} />
                                Ses Ayırma Başlat
                            </>
                        )}
                    </button>

                    {/* Progress */}
                    {status && status.status === 'processing' && (
                        <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 600, color: '#a855f7' }}>
                                        {status.progress}%
                                    </span>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        {status.message}
                                    </span>
                                </div>
                                <div style={{
                                    width: '100%',
                                    height: '8px',
                                    background: 'var(--surface-color)',
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${status.progress}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #a855f7, #c084fc)',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div style={{
                            marginTop: '1.5rem',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '1rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '0.5rem'
                        }}>
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}
                </div>

                {/* Right Column - Audio Player */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                        Ses Önizleme & İndirme
                    </h3>

                    {status?.status === 'completed' ? (
                        <>
                            {/* Main Play Controls */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                marginBottom: '2rem',
                                padding: '1rem',
                                background: 'var(--surface-color)',
                                borderRadius: '0.75rem'
                            }}>
                                <button
                                    onClick={togglePlay}
                                    style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        background: '#a855f7',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {isPlaying ? <Pause size={24} color="white" /> : <Play size={24} color="white" />}
                                </button>

                                <div style={{ flex: 1 }}>
                                    <div
                                        onClick={handleSeek}
                                        style={{
                                            height: '8px',
                                            background: 'var(--border-color)',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            position: 'relative'
                                        }}
                                    >
                                        <div style={{
                                            width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                                            height: '100%',
                                            background: 'linear-gradient(90deg, #a855f7, #c084fc)',
                                            borderRadius: '4px'
                                        }} />
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        marginTop: '0.5rem',
                                        fontSize: '0.85rem',
                                        color: 'var(--text-secondary)'
                                    }}>
                                        <span>{formatTime(currentTime)}</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Track Rows */}
                            {[
                                { key: 'original', label: 'Original Sound', color: '#06b6d4', ref: originalRef },
                                { key: 'isolated', label: 'Isolated Sound', color: '#ec4899', ref: isolatedRef },
                                { key: 'residual', label: 'Without Isolated Sound', color: '#8b5cf6', ref: residualRef }
                            ].map(track => (
                                <div
                                    key={track.key}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '1rem',
                                        marginBottom: '0.75rem',
                                        background: `${track.color}10`,
                                        border: `1px solid ${track.color}30`,
                                        borderRadius: '0.5rem'
                                    }}
                                >
                                    {/* Mute Button */}
                                    <button
                                        onClick={() => toggleMute(track.key)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '0.25rem'
                                        }}
                                    >
                                        {mutedTracks[track.key] ? (
                                            <VolumeX size={20} color={track.color} />
                                        ) : (
                                            <Volume2 size={20} color={track.color} />
                                        )}
                                    </button>

                                    {/* Track Label */}
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontWeight: 600, color: track.color }}>
                                            {track.label}
                                        </span>
                                        {/* Hidden audio element */}
                                        <audio
                                            ref={track.ref}
                                            src={status.downloads?.[track.key]}
                                            muted={mutedTracks[track.key]}
                                            onLoadedMetadata={handleAudioLoaded}
                                        />
                                    </div>

                                    {/* Download Button */}
                                    <button
                                        onClick={() => downloadTrack(track.key)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.5rem 1rem',
                                            background: track.color,
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '0.5rem',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        <Download size={16} />
                                        İndir
                                    </button>
                                </div>
                            ))}

                            {/* Success Message */}
                            <div style={{
                                marginTop: '1.5rem',
                                padding: '1rem',
                                background: 'rgba(16, 185, 129, 0.1)',
                                borderRadius: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <CheckCircle size={20} color="#10b981" />
                                <span style={{ color: '#10b981', fontWeight: 500 }}>
                                    Ses ayırma tamamlandı! Prompt: "{status.prompt}"
                                </span>
                            </div>
                        </>
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            padding: '4rem 2rem',
                            color: 'var(--text-secondary)'
                        }}>
                            <Music size={64} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                                Henüz işlem yok
                            </p>
                            <p style={{ fontSize: '0.9rem' }}>
                                Ses dosyası yükleyin ve işlemi başlatın
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
