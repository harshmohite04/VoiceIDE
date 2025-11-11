# OpenAI Realtime Voice Integration Guide

## Overview

This application now supports **OpenAI's Realtime API** for direct speech-to-speech conversations, eliminating the latency of traditional STT → LLM → TTS pipelines. The realtime mode provides natural, low-latency voice interactions with the AI assistant.

## Features

### 🚀 Realtime Mode
- **Direct Speech-to-Speech**: No intermediate text processing
- **Low Latency**: Immediate AI responses to voice input
- **Voice Activity Detection**: Automatic speech start/stop detection
- **Streaming Audio**: Real-time audio response playback
- **Live Transcription**: See what you're saying in real-time
- **Concurrent Responses**: Text and audio responses simultaneously

### 🔄 Traditional Mode
- **STT → LLM → TTS Pipeline**: Classic approach for comparison
- **Full Transcription**: Complete text-based conversation history
- **File Upload Support**: Send audio files for processing

## Setup Requirements

### 1. OpenAI API Configuration
```bash
# Set your OpenAI API key with Realtime API access
OPENAI_API_KEY=your_openai_api_key_here
```

**Important**: You need access to OpenAI's Realtime API (currently in preview). Contact OpenAI for access if you don't have it.

### 2. Browser Requirements
- **Modern Browser**: Chrome, Firefox, Safari, or Edge
- **Microphone Access**: Required for voice input
- **Audio Context Support**: For real-time audio processing

## How to Use

### Starting a Realtime Session

1. **Navigate to the Application**: Open the VoiceDev Partner web interface
2. **Select Realtime Mode**: Click the "Realtime Voice ⚡" toggle button
3. **Activate Realtime**: Click the "Start Realtime" button to begin
4. **Wait for Connection**: Status will show "Connected" when ready

### Voice Interaction

1. **Hold to Speak**: Press and hold the microphone button
2. **Speak Naturally**: Talk to the AI assistant normally
3. **Release to Send**: Let go of the button to send your audio
4. **Listen to Response**: AI will respond with both voice and text

### Features During Conversation

- **Live Transcription**: See your words transcribed in real-time
- **Voice Activity Detection**: AI detects when you start/stop speaking
- **Streaming Responses**: Hear AI responses as they're generated
- **Text Backup**: All conversations are also shown as text
- **Audio Controls**: Stop audio playback if needed

## Technical Details

### Audio Processing
- **Sample Rate**: 24kHz
- **Format**: PCM16 (16-bit linear PCM)
- **Channels**: Mono (1 channel)
- **Encoding**: Base64 for WebSocket transmission

### WebSocket Connection
- **Endpoint**: `wss://api.openai.com/v1/realtime`
- **Model**: `gpt-4o-realtime-preview-2024-10-01`
- **Voice**: `alloy` (configurable)
- **Protocol**: OpenAI Realtime API v1

### Session Management
- **Auto-Connect**: Connects to OpenAI when realtime mode is activated
- **Session Cleanup**: Properly closes connections when deactivated
- **Error Handling**: Graceful fallback and error reporting

## Comparison: Traditional vs Realtime

| Feature | Traditional Mode | Realtime Mode |
|---------|------------------|---------------|
| **Latency** | 2-5 seconds | <1 second |
| **Audio Quality** | High (TTS) | High (Native) |
| **Conversation Flow** | Turn-based | Natural |
| **Interruption** | Not supported | Supported |
| **Processing** | STT→LLM→TTS | Direct S2S |
| **Bandwidth** | Lower | Higher |
| **Cost** | Standard | Premium |

## Troubleshooting

### Connection Issues
- **Check API Key**: Ensure you have Realtime API access
- **Browser Permissions**: Allow microphone access
- **Network**: Stable internet connection required

### Audio Problems
- **No Audio Input**: Check microphone permissions and hardware
- **No Audio Output**: Check speaker/headphone settings
- **Choppy Audio**: May indicate network or processing issues

### Performance Tips
- **Use Headphones**: Prevents audio feedback
- **Stable Network**: WiFi or ethernet recommended
- **Close Other Apps**: Reduce CPU/memory usage for better performance

## API Events

### Client → Server
- `realtime:start-session` - Initialize realtime session
- `realtime:audio-chunk` - Send audio data
- `realtime:audio-commit` - Commit audio for processing
- `realtime:end-session` - End realtime session

### Server → Client
- `realtime:connected` - Session connected to OpenAI
- `realtime:speech-started` - Voice activity detected
- `realtime:speech-stopped` - Voice activity ended
- `realtime:transcription` - Live transcription update
- `realtime:audio-response` - Streaming audio response
- `realtime:text-response` - Streaming text response
- `realtime:error` - Error occurred

## Development Notes

### File Structure
```
packages/backend/src/services/
├── realtimeVoiceService.ts    # OpenAI Realtime API integration
├── voiceService.ts            # Traditional voice processing
└── sessionService.ts          # Session management

packages/frontend/components/
├── RealtimeVoiceChat.tsx      # Realtime voice interface
├── VoiceChat.tsx              # Traditional voice interface
└── Header.tsx                 # Navigation

packages/backend/src/socket/
└── socketHandlers.ts          # WebSocket event handling
```

### Key Classes
- **RealtimeVoiceService**: Manages OpenAI WebSocket connections
- **RealtimeVoiceChat**: Frontend component for realtime interactions
- **Socket Handlers**: Bridge between frontend and OpenAI API

## Future Enhancements

- **Voice Selection**: Multiple voice options
- **Language Support**: Multi-language conversations
- **Custom Instructions**: Personalized AI behavior
- **Audio Effects**: Voice modulation and enhancement
- **Group Conversations**: Multi-user realtime sessions

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify OpenAI API key and Realtime access
3. Test with traditional mode first
4. Review network connectivity and permissions
