'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth, useSocket } from '../app/providers'
import { Mic, MicOff, Volume2, VolumeX, Zap, ZapOff, MessageCircle, Settings, Sparkles } from 'lucide-react'
import { AIAvatar, VoiceVisualization } from './AIAvatar'

interface RealtimeMessage {
  id: string
  type: 'user' | 'ai' | 'system'
  text: string
  timestamp: string
  isTranscription?: boolean
}

export function RealtimeVoiceChat() {
  const { user } = useAuth()
  const { socket, connected } = useSocket()
  const [messages, setMessages] = useState<RealtimeMessage[]>([])
  const [isRealtimeActive, setIsRealtimeActive] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [aiState, setAiState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle')
  const [audioLevel, setAudioLevel] = useState(0)
  const [showMessages, setShowMessages] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioChunksRef = useRef<Float32Array[]>([])
  const audioQueueRef = useRef<Float32Array[]>([])
  const isPlayingRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize session when user connects
  useEffect(() => {
    if (socket && user && !sessionId && isRealtimeActive) {
      const newSessionId = `realtime_${Date.now()}_${user.uid}`
      setSessionId(newSessionId)
      setConnectionStatus('connecting')
      socket.emit('realtime:start-session', { userId: user.uid, sessionId: newSessionId })
    }
  }, [socket, user, sessionId, isRealtimeActive])

  // Socket event listeners for realtime events
  useEffect(() => {
    if (!socket) return

    const handleRealtimeConnected = (data: any) => {
      setConnectionStatus('connected')
      addSystemMessage('Connected to realtime voice assistant')
    }

    const handleRealtimeDisconnected = (data: any) => {
      setConnectionStatus('disconnected')
      addSystemMessage('Disconnected from realtime voice assistant')
    }

    const handleRealtimeError = (error: any) => {
      console.error('Realtime error:', error)
      addSystemMessage(`Error: ${error.message || error.error || 'Unknown error'}`)
      setConnectionStatus('disconnected')
    }

    const handleSpeechStarted = (data: any) => {
      setAiState('listening')
      addSystemMessage('🎤 Speech detected...')
    }

    const handleSpeechStopped = (data: any) => {
      setAiState('thinking')
      addSystemMessage('🔇 Speech ended')
    }

    const handleTranscription = (data: any) => {
      setCurrentTranscript(data.transcript)
      const userMessage: RealtimeMessage = {
        id: `user_${Date.now()}`,
        type: 'user',
        text: data.transcript,
        timestamp: new Date().toISOString(),
        isTranscription: true,
      }
      setMessages(prev => [...prev, userMessage])
    }

    const handleAudioResponse = (data: any) => {
      console.log('Received audio response:', data.type, data.audioData ? `${data.audioData.length} chars` : 'no data')
      if (data.type === 'delta' && data.audioData) {
        setAiState('speaking')
        // Simulate audio level for visualization
        setAudioLevel(Math.random() * 80 + 20)
        // Queue audio chunk for playback
        queueAudioChunk(data.audioData)
      } else if (data.type === 'done') {
        setAiState('idle')
        setAudioLevel(0)
        // Audio response complete
        addSystemMessage('🔊 Audio response complete')
      }
    }

    const handleTextResponse = (data: any) => {
      if (data.type === 'delta' && data.textData) {
        setAiState('speaking')
        // Update or create AI message with streaming text
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage && lastMessage.type === 'ai' && !lastMessage.isTranscription) {
            // Update existing AI message
            return prev.map((msg, index) => 
              index === prev.length - 1 
                ? { ...msg, text: msg.text + data.textData }
                : msg
            )
          } else {
            // Create new AI message
            const aiMessage: RealtimeMessage = {
              id: `ai_${Date.now()}`,
              type: 'ai',
              text: data.textData,
              timestamp: new Date().toISOString(),
            }
            return [...prev, aiMessage]
          }
        })
      } else if (data.type === 'done' && data.text) {
        setAiState('idle')
        // Final text response
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage && lastMessage.type === 'ai' && !lastMessage.isTranscription) {
            // Update with final text
            return prev.map((msg, index) => 
              index === prev.length - 1 
                ? { ...msg, text: data.text }
                : msg
            )
          } else {
            // Create new AI message with final text
            const aiMessage: RealtimeMessage = {
              id: `ai_${Date.now()}`,
              type: 'ai',
              text: data.text,
              timestamp: new Date().toISOString(),
            }
            return [...prev, aiMessage]
          }
        })
      }
    }

    socket.on('realtime:connected', handleRealtimeConnected)
    socket.on('realtime:disconnected', handleRealtimeDisconnected)
    socket.on('realtime:error', handleRealtimeError)
    socket.on('realtime:speech-started', handleSpeechStarted)
    socket.on('realtime:speech-stopped', handleSpeechStopped)
    socket.on('realtime:transcription', handleTranscription)
    socket.on('realtime:audio-response', handleAudioResponse)
    socket.on('realtime:text-response', handleTextResponse)

    return () => {
      socket.off('realtime:connected', handleRealtimeConnected)
      socket.off('realtime:disconnected', handleRealtimeDisconnected)
      socket.off('realtime:error', handleRealtimeError)
      socket.off('realtime:speech-started', handleSpeechStarted)
      socket.off('realtime:speech-stopped', handleSpeechStopped)
      socket.off('realtime:transcription', handleTranscription)
      socket.off('realtime:audio-response', handleAudioResponse)
      socket.off('realtime:text-response', handleTextResponse)
    }
  }, [socket])

  const addSystemMessage = (text: string) => {
    const systemMessage: RealtimeMessage = {
      id: `system_${Date.now()}`,
      type: 'system',
      text,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, systemMessage])
  }

  const queueAudioChunk = async (base64Audio: string) => {
    try {
      console.log('Queuing audio chunk, length:', base64Audio.length)
      
      // Try alternative approach: use HTML5 Audio element for MP3/WAV
      if (base64Audio.startsWith('data:audio/')) {
        // If it's already a data URL, play directly
        playAudioDataUrl(base64Audio)
        return
      }
      
      // Convert base64 to ArrayBuffer (PCM16 format from OpenAI)
      const binaryString = atob(base64Audio)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      console.log('Raw audio bytes:', bytes.length)
      
      // Convert PCM16 to Float32 for Web Audio API
      const pcm16Array = new Int16Array(bytes.buffer)
      const float32Array = new Float32Array(pcm16Array.length)
      for (let i = 0; i < pcm16Array.length; i++) {
        float32Array[i] = pcm16Array[i] / 32768.0 // Convert to -1.0 to 1.0 range
      }
      
      console.log('Converted to float32, samples:', float32Array.length)
      audioQueueRef.current.push(float32Array)
      
      // Start playing if not already playing
      if (!isPlayingRef.current) {
        playQueuedAudio()
      }
    } catch (error) {
      console.error('Error queuing audio chunk:', error)
    }
  }

  // Alternative playback method using HTML5 Audio
  const playAudioDataUrl = (dataUrl: string) => {
    try {
      const audio = new Audio(dataUrl)
      audio.onplay = () => {
        setIsPlaying(true)
        console.log('HTML5 audio started playing')
      }
      audio.onended = () => {
        setIsPlaying(false)
        console.log('HTML5 audio finished')
      }
      audio.onerror = (e) => {
        console.error('HTML5 audio error:', e)
        setIsPlaying(false)
      }
      audio.play()
    } catch (error) {
      console.error('Error playing HTML5 audio:', error)
    }
  }

  const playQueuedAudio = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return
    
    isPlayingRef.current = true
    setIsPlaying(true)

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 })
      }

      // Resume audio context if suspended (required by some browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      console.log('Playing queued audio, chunks:', audioQueueRef.current.length)

      while (audioQueueRef.current.length > 0) {
        const float32Data = audioQueueRef.current.shift()!
        
        // Create audio buffer from PCM data
        const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000)
        const channelData = audioBuffer.getChannelData(0)
        for (let i = 0; i < float32Data.length; i++) {
          channelData[i] = float32Data[i]
        }
        
        const source = audioContextRef.current.createBufferSource()
        source.buffer = audioBuffer
        source.connect(audioContextRef.current.destination)
        
        console.log('Playing audio chunk, duration:', audioBuffer.duration)
        
        // Wait for audio to finish playing
        await new Promise<void>((resolve) => {
          source.onended = () => {
            console.log('Audio chunk finished')
            resolve()
          }
          source.start()
        })
      }
    } catch (error) {
      console.error('Error playing queued audio:', error)
    } finally {
      isPlayingRef.current = false
      setIsPlaying(false)
      console.log('Audio playback finished')
    }
  }

  const toggleRealtimeMode = async () => {
    if (!isRealtimeActive) {
      // Start realtime mode
      setIsRealtimeActive(true)
      addSystemMessage('🚀 Realtime mode activated')
    } else {
      // End realtime mode
      if (socket && sessionId) {
        socket.emit('realtime:end-session', { sessionId, userId: user?.uid })
      }
      setIsRealtimeActive(false)
      setSessionId(null)
      setConnectionStatus('disconnected')
      addSystemMessage('⏹️ Realtime mode deactivated')
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      })

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 })
      }

      const source = audioContextRef.current.createMediaStreamSource(stream)
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1)
      
      audioChunksRef.current = []

      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer
        const inputData = inputBuffer.getChannelData(0)
        
        // Calculate audio level for visualization
        let sum = 0
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i]
        }
        const rms = Math.sqrt(sum / inputData.length)
        setAudioLevel(Math.min(100, rms * 1000))
        
        // Convert to PCM16 and send to server
        const pcm16 = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768))
        }
        
        // Convert to base64 and send
        const uint8Array = new Uint8Array(pcm16.buffer)
        const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)))
        
        if (socket && sessionId && connectionStatus === 'connected') {
          socket.emit('realtime:audio-chunk', { sessionId, audioData: base64Audio })
        }
      }

      source.connect(processor)
      processor.connect(audioContextRef.current.destination)

      setIsRecording(true)
      setAiState('listening')
      
      // Store references for cleanup
      mediaRecorderRef.current = { stream, source, processor } as any

    } catch (error) {
      console.error('Error starting recording:', error)
      addSystemMessage('❌ Failed to start recording')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      const { stream, source, processor } = mediaRecorderRef.current as any
      
      // Cleanup audio processing
      if (processor) processor.disconnect()
      if (source) source.disconnect()
      if (stream) stream.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      
      // Commit audio to OpenAI
      if (socket && sessionId && connectionStatus === 'connected') {
        socket.emit('realtime:audio-commit', { sessionId })
      }
      
      setIsRecording(false)
      setAudioLevel(0)
      setAiState('thinking')
    }
  }

  const stopAudio = () => {
    if (audioContextRef.current) {
      audioContextRef.current.suspend()
      audioQueueRef.current = []
      isPlayingRef.current = false
      setIsPlaying(false)
    }
  }

  // Test audio functionality
  const testAudio = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 })
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      // Generate a simple test tone
      const duration = 1 // 1 second
      const sampleRate = 24000
      const frequency = 440 // A4 note
      const samples = duration * sampleRate
      
      const audioBuffer = audioContextRef.current.createBuffer(1, samples, sampleRate)
      const channelData = audioBuffer.getChannelData(0)
      
      for (let i = 0; i < samples; i++) {
        channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.1
      }
      
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      source.start()
      
      console.log('Test audio played successfully')
      addSystemMessage('🔊 Test audio played - speakers working!')
    } catch (error) {
      console.error('Test audio failed:', error)
      addSystemMessage('❌ Test audio failed - check speakers/permissions')
    }
  }

  if (!user) {
    return (
      <div className="glass-effect rounded-2xl p-8 text-center max-w-md mx-auto">
        <div className="ai-avatar mx-auto mb-6">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-4">VoiceDev Partner</h2>
        <p className="text-slate-300 mb-6">
          Please sign in to start your AI conversation.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-[600px] flex flex-col">
      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-green-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Central AI Avatar */}
        <div className="relative z-10">
          <AIAvatar 
            state={aiState} 
            audioLevel={audioLevel} 
            isActive={isRealtimeActive}
          />
        </div>

        {/* Current Transcript Display */}
        {currentTranscript && (
          <div className="mt-6 max-w-md text-center">
            <div className="glass-effect rounded-lg px-4 py-2">
              <p className="text-slate-300 text-sm italic">"{currentTranscript}"</p>
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-400 glow-green' : 
            connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
          }`} />
          <span className="text-slate-300 text-sm capitalize">
            {connectionStatus}
          </span>
        </div>

        {/* Controls */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center space-x-4">
            {/* Realtime Toggle */}
            <button
              onClick={toggleRealtimeMode}
              disabled={!connected}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-full font-medium smooth-transition disabled:opacity-50 smooth-scale
                ${isRealtimeActive 
                  ? 'bg-green-500/20 border border-green-500/50 text-green-400 glow-green' 
                  : 'bg-blue-500/20 border border-blue-500/50 text-blue-400 glow-blue'
                }
              `}
            >
              {isRealtimeActive ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              <span className="text-sm">
                {isRealtimeActive ? 'Active' : 'Start'}
              </span>
            </button>

            {/* Voice Recording Button */}
            {isRealtimeActive && (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={connectionStatus !== 'connected'}
                className={`
                  p-4 rounded-full font-medium smooth-transition disabled:opacity-50
                  ${isRecording 
                    ? 'bg-red-500/20 border-2 border-red-500 text-red-400 recording-pulse glow-red' 
                    : 'bg-blue-500/20 border-2 border-blue-500/50 text-blue-400 hover:border-blue-400 smooth-scale'
                  }
                `}
              >
                {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
            )}

            {/* Messages Toggle */}
            <button
              onClick={() => setShowMessages(!showMessages)}
              className="flex items-center space-x-2 px-4 py-2 rounded-full bg-slate-500/20 border border-slate-500/50 text-slate-400 hover:text-slate-300 smooth-transition smooth-scale"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm">Chat</span>
              {messages.length > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {messages.length}
                </span>
              )}
            </button>

            {/* Utility Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={testAudio}
                className="p-2 rounded-full bg-green-500/20 border border-green-500/50 text-green-400 hover:text-green-300 smooth-transition smooth-scale"
                title="Test Audio"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              
              {isPlaying && (
                <button
                  onClick={stopAudio}
                  className="p-2 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 hover:text-red-300 smooth-transition smooth-scale"
                  title="Stop Audio"
                >
                  <VolumeX className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Messages Panel */}
      {showMessages && (
        <div className="glass-effect border-t border-slate-700/50 max-h-80 overflow-hidden smooth-transition">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">Conversation</h3>
              <button
                onClick={() => setShowMessages(false)}
                className="text-slate-400 hover:text-slate-300 smooth-transition"
              >
                ✕
              </button>
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No messages yet. Start a conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message-enter flex ${
                      message.type === 'user' ? 'justify-end' : 
                      message.type === 'system' ? 'justify-center' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg text-sm smooth-transition ${
                        message.type === 'user'
                          ? 'bg-blue-500/20 border border-blue-500/50 text-blue-100'
                          : message.type === 'system'
                          ? 'bg-slate-600/20 border border-slate-600/50 text-slate-300 text-xs'
                          : 'bg-green-500/20 border border-green-500/50 text-green-100'
                      }`}
                    >
                      <p>{message.text}</p>
                      {message.type !== 'system' && (
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                          {message.isTranscription && (
                            <span className="text-xs opacity-70 ml-2">🎤</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
