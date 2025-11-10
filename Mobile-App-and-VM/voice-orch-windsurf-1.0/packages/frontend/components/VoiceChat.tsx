'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth, useSocket } from '../app/providers'
import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'ai'
  text: string
  audio?: string
  timestamp: string
}

export function VoiceChat() {
  const { user } = useAuth()
  const { socket, connected } = useSocket()
  const [messages, setMessages] = useState<Message[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize session when user connects
  useEffect(() => {
    if (socket && user && !sessionId) {
      const newSessionId = `session_${Date.now()}_${user.uid}`
      setSessionId(newSessionId)
      socket.emit('voice:start-session', { userId: user.uid, sessionId: newSessionId })
    }
  }, [socket, user, sessionId])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    socket.on('voice:response', (response) => {
      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        text: response.text,
        audio: response.audio,
        timestamp: response.timestamp,
      }
      
      setMessages(prev => [...prev, aiMessage])
      
      // Auto-play AI response if audio is available
      if (response.audio) {
        playAudioResponse(response.audio)
      }
    })

    socket.on('voice:error', (error) => {
      console.error('Voice error:', error)
      // Add error message to chat
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        type: 'ai',
        text: `Error: ${error.message}`,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMessage])
    })

    return () => {
      socket.off('voice:response')
      socket.off('voice:error')
    }
  }, [socket])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        sendAudioMessage(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const sendAudioMessage = async (audioBlob: Blob) => {
    if (!socket || !sessionId || !user) return

    // Add user message placeholder
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      text: 'Voice message...',
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])

    // Send audio to backend
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.wav')
    formData.append('sessionId', sessionId)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/voice/process-audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`,
        },
        body: formData,
      })

      const result = await response.json()
      
      // Update user message with transcription
      if (result.transcription) {
        setMessages(prev => prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, text: result.transcription }
            : msg
        ))
      }
    } catch (error) {
      console.error('Error sending audio:', error)
    }
  }

  const sendTextMessage = async () => {
    if (!textInput.trim() || !socket || !sessionId || !user) return

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      text: textInput,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setTextInput('')

    // Send via socket
    socket.emit('voice:text-message', {
      sessionId,
      message: textInput,
      userId: user.uid,
    })
  }

  const playAudioResponse = (audioData: string) => {
    if (!audioData) return

    try {
      const audio = new Audio(`data:audio/mp3;base64,${audioData}`)
      audioRef.current = audio
      
      audio.onplay = () => setIsPlaying(true)
      audio.onended = () => setIsPlaying(false)
      audio.onerror = () => setIsPlaying(false)
      
      audio.play()
    } catch (error) {
      console.error('Error playing audio:', error)
    }
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  if (!user) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-white mb-4">Welcome to VoiceDev Partner</h2>
        <p className="text-slate-300 mb-6">
          Please sign in to start your voice-powered development conversation.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 rounded-xl overflow-hidden">
      {/* Connection Status */}
      <div className="bg-slate-700/50 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-sm text-slate-300">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {isPlaying && (
          <button
            onClick={stopAudio}
            className="flex items-center space-x-1 text-blue-400 hover:text-blue-300"
          >
            <VolumeX className="w-4 h-4" />
            <span className="text-sm">Stop Audio</span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 mt-8">
            <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Start a conversation by recording a voice message or typing below.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message-enter flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-slate-100'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                  {message.audio && (
                    <button
                      onClick={() => playAudioResponse(message.audio!)}
                      className="ml-2 p-1 hover:bg-slate-600 rounded"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-700 p-4">
        <div className="flex items-center space-x-3">
          {/* Voice Recording Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!connected}
            className={`
              p-3 rounded-full font-medium transition-all duration-200 disabled:opacity-50
              ${isRecording 
                ? 'bg-red-500 hover:bg-red-600 text-white recording-pulse' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              }
            `}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input */}
          <div className="flex-1 flex space-x-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
              placeholder="Type a message or use voice..."
              disabled={!connected}
              className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={sendTextMessage}
              disabled={!connected || !textInput.trim()}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isRecording && (
          <div className="mt-3 flex items-center justify-center space-x-2 text-red-400">
            <div className="voice-wave">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="text-sm">Recording... Click to stop</span>
          </div>
        )}
      </div>
    </div>
  )
}
