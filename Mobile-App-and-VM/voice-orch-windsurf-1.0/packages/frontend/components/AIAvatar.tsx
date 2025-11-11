'use client'

import { useEffect, useState } from 'react'
import { Mic, Volume2, Brain, Sparkles } from 'lucide-react'

interface AIAvatarProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking'
  audioLevel?: number // 0-100 for dynamic wave visualization
  isActive?: boolean
}

export function AIAvatar({ state = 'idle', audioLevel = 0, isActive = false }: AIAvatarProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])

  // Generate random particles for ambient effect
  useEffect(() => {
    if (isActive) {
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 6
      }))
      setParticles(newParticles)
    } else {
      setParticles([])
    }
  }, [isActive])

  const getAvatarIcon = () => {
    switch (state) {
      case 'listening':
        return <Mic className="w-8 h-8 text-white" />
      case 'thinking':
        return <Brain className="w-8 h-8 text-white" />
      case 'speaking':
        return <Volume2 className="w-8 h-8 text-white" />
      default:
        return <Sparkles className="w-8 h-8 text-white" />
    }
  }

  const getStateText = () => {
    switch (state) {
      case 'listening':
        return 'Listening...'
      case 'thinking':
        return 'Thinking...'
      case 'speaking':
        return 'Speaking...'
      default:
        return 'Ready to chat'
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center py-8">
      {/* Particle Background */}
      {isActive && (
        <div className="particles absolute inset-0">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="particle"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                animationDelay: `${particle.delay}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Circular Wave Ripples */}
      {(state === 'listening' || state === 'speaking') && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="circular-wave" />
          <div className="circular-wave" />
          <div className="circular-wave" />
        </div>
      )}

      {/* Main AI Avatar */}
      <div className={`ai-avatar ${state} smooth-transition`}>
        {getAvatarIcon()}
      </div>

      {/* State Indicator */}
      <div className="mt-6 text-center">
        <p className="text-white font-medium text-lg mb-2">{getStateText()}</p>
        
        {/* Dynamic State Visualization */}
        {state === 'listening' && (
          <div className="enhanced-voice-wave">
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className="wave-bar"
                style={{
                  transform: `scaleY(${0.2 + (audioLevel / 100) * 0.8})`,
                  opacity: 0.6 + (audioLevel / 100) * 0.4
                }}
              />
            ))}
          </div>
        )}

        {state === 'thinking' && (
          <div className="thinking-dots">
            <div className="dot" />
            <div className="dot" />
            <div className="dot" />
          </div>
        )}

        {state === 'speaking' && (
          <div className="audio-wave">
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className="bar"
                style={{
                  transform: `scaleY(${0.3 + (audioLevel / 100) * 0.7})`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        )}

        {state === 'idle' && isActive && (
          <div className="text-slate-400 text-sm">
            Click to start voice conversation
          </div>
        )}
      </div>

      {/* Audio Level Indicator */}
      {audioLevel > 0 && (
        <div className="mt-4 w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-150"
            style={{ width: `${audioLevel}%` }}
          />
        </div>
      )}
    </div>
  )
}

// Voice Visualization Component for more detailed audio feedback
export function VoiceVisualization({ 
  isActive, 
  audioData, 
  type = 'bars' 
}: { 
  isActive: boolean
  audioData?: number[]
  type?: 'bars' | 'wave' | 'circular'
}) {
  if (!isActive) return null

  const renderBars = () => (
    <div className="flex items-center justify-center gap-1">
      {Array.from({ length: 20 }, (_, i) => (
        <div
          key={i}
          className="w-1 bg-gradient-to-t from-blue-500 to-green-400 rounded-full transition-all duration-100"
          style={{
            height: `${8 + (audioData?.[i] || Math.random() * 40)}px`,
            opacity: 0.7 + (audioData?.[i] || Math.random()) * 0.3
          }}
        />
      ))}
    </div>
  )

  const renderWave = () => (
    <div className="relative w-64 h-16">
      <svg className="w-full h-full" viewBox="0 0 256 64">
        <path
          d={`M0,32 ${Array.from({ length: 32 }, (_, i) => 
            `L${i * 8},${32 + (audioData?.[i] || Math.sin(i * 0.5) * 16)}`
          ).join(' ')}`}
          stroke="url(#waveGradient)"
          strokeWidth="2"
          fill="none"
          className="animate-pulse"
        />
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )

  const renderCircular = () => (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full animate-spin" style={{ animationDuration: '8s' }}>
        <circle
          cx="64"
          cy="64"
          r="56"
          stroke="url(#circularGradient)"
          strokeWidth="4"
          fill="none"
          strokeDasharray={`${(audioData?.[0] || 50) * 3.5} 350`}
          className="transition-all duration-300"
        />
        <defs>
          <linearGradient id="circularGradient">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )

  return (
    <div className="flex items-center justify-center py-4">
      {type === 'bars' && renderBars()}
      {type === 'wave' && renderWave()}
      {type === 'circular' && renderCircular()}
    </div>
  )
}
