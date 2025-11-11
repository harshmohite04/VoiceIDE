'use client'

import { useState, useEffect } from 'react'
import { useAuth, useSocket } from '../app/providers'

export function RealtimeDiagnostics() {
  const { user } = useAuth()
  const { socket, connected } = useSocket()
  const [diagnostics, setDiagnostics] = useState<string[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)

  const addDiagnostic = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDiagnostics(prev => [...prev, `[${timestamp}] ${message}`])
  }

  useEffect(() => {
    if (!socket) return

    // Listen to all realtime events for diagnostics
    const events = [
      'realtime:connected',
      'realtime:disconnected', 
      'realtime:error',
      'realtime:speech-started',
      'realtime:speech-stopped',
      'realtime:transcription',
      'realtime:audio-response',
      'realtime:text-response'
    ]

    events.forEach(event => {
      socket.on(event, (data) => {
        addDiagnostic(`${event}: ${JSON.stringify(data).substring(0, 100)}...`)
      })
    })

    return () => {
      events.forEach(event => socket.off(event))
    }
  }, [socket])

  const startDiagnosticSession = () => {
    if (!socket || !user) return

    const newSessionId = `diagnostic_${Date.now()}_${user.uid}`
    setSessionId(newSessionId)
    addDiagnostic('Starting diagnostic session...')
    
    socket.emit('realtime:start-session', { 
      userId: user.uid, 
      sessionId: newSessionId 
    })
  }

  const testAudioRequest = () => {
    if (!socket || !sessionId) return

    addDiagnostic('Sending test audio request...')
    
    // Send a simple test message as if it were audio
    const testAudio = btoa('Hello, can you hear me? Please create a simple login page.')
    socket.emit('realtime:audio-chunk', { 
      sessionId, 
      audioData: testAudio 
    })
    
    setTimeout(() => {
      socket.emit('realtime:audio-commit', { sessionId })
    }, 1000)
  }

  const clearDiagnostics = () => {
    setDiagnostics([])
  }

  if (!user) {
    return <div className="text-white">Please sign in to run diagnostics</div>
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-6">
      <h3 className="text-xl font-semibold text-white mb-4">Realtime API Diagnostics</h3>
      
      <div className="space-y-4 mb-6">
        <div className="flex space-x-3">
          <button
            onClick={startDiagnosticSession}
            disabled={!connected}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
          >
            Start Diagnostic Session
          </button>
          
          <button
            onClick={testAudioRequest}
            disabled={!sessionId}
            className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
          >
            Test Audio Request
          </button>
          
          <button
            onClick={clearDiagnostics}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            Clear Log
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-slate-300">
            Socket: {connected ? 'Connected' : 'Disconnected'}
          </span>
          {sessionId && (
            <>
              <div className="w-3 h-3 rounded-full bg-blue-400" />
              <span className="text-slate-300">Session: {sessionId.substring(0, 20)}...</span>
            </>
          )}
        </div>
      </div>

      <div className="bg-slate-900 rounded-lg p-4 h-96 overflow-y-auto">
        <h4 className="text-white font-medium mb-2">Diagnostic Log:</h4>
        {diagnostics.length === 0 ? (
          <p className="text-slate-400">No diagnostic data yet. Start a session to begin.</p>
        ) : (
          <div className="space-y-1">
            {diagnostics.map((diagnostic, index) => (
              <div key={index} className="text-sm font-mono text-slate-300">
                {diagnostic}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-slate-400">
        <p><strong>Expected Flow:</strong></p>
        <ol className="list-decimal list-inside space-y-1 mt-2">
          <li>realtime:connected - OpenAI WebSocket connected</li>
          <li>realtime:speech-started - Voice activity detected</li>
          <li>realtime:transcription - Your speech transcribed</li>
          <li>realtime:text-response - AI text response</li>
          <li>realtime:audio-response - AI audio response (this is what's missing!)</li>
        </ol>
      </div>
    </div>
  )
}
