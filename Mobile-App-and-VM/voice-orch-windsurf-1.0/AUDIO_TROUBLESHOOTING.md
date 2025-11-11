# Audio Output Troubleshooting Guide

## Common Issues and Solutions

### 1. No Audio Output from Realtime API

**Symptoms:**
- Realtime mode connects successfully
- You can see transcriptions of your speech
- No audio plays from AI responses
- Console shows audio chunks being received

**Debugging Steps:**

#### Step 1: Test Basic Audio
1. Click the **"Test Audio"** button in the realtime interface
2. You should hear a 1-second beep tone
3. If no sound: Check browser audio permissions and system volume

#### Step 2: Check Browser Console
Open browser DevTools (F12) and look for:
```
Queuing audio chunk, length: [number]
Raw audio bytes: [number]
Converted to float32, samples: [number]
Playing queued audio, chunks: [number]
```

#### Step 3: Verify OpenAI API Access
- Ensure you have OpenAI Realtime API access (preview feature)
- Check that `OPENAI_API_KEY` is set correctly
- Verify API key has Realtime API permissions

### 2. Browser Audio Context Issues

**Common Problems:**
- Audio context suspended (requires user interaction)
- Incorrect sample rate or format
- Browser security restrictions

**Solutions:**

#### Enable Audio Context
```javascript
// Audio context needs user interaction to start
// Click anywhere on the page first, then try realtime mode
```

#### Check Audio Permissions
1. Look for microphone permission prompt
2. Ensure site has audio playback permissions
3. Check browser settings for audio/media permissions

### 3. OpenAI Audio Format Issues

**Expected Format:**
- **Input**: PCM16, 24kHz, mono
- **Output**: PCM16, 24kHz, mono
- **Encoding**: Base64 over WebSocket

**Debugging:**
```javascript
// Check what OpenAI actually sends
console.log('Audio response:', data.type, data.audioData?.length)
```

### 4. Network and Connection Issues

**Symptoms:**
- Intermittent audio
- Choppy playback
- Connection drops

**Solutions:**
- Use stable internet connection
- Close other bandwidth-heavy applications
- Check WebSocket connection status

## Step-by-Step Debugging

### 1. Basic Audio Test
```bash
# In browser console, test if Web Audio API works:
const ctx = new AudioContext()
const osc = ctx.createOscillator()
osc.connect(ctx.destination)
osc.start()
setTimeout(() => osc.stop(), 1000)
```

### 2. Check Realtime Connection
```bash
# Look for these console messages:
"Connected to OpenAI Realtime API for session: [sessionId]"
"Sent session configuration for: [sessionId]"
```

### 3. Monitor Audio Data Flow
```bash
# Should see these in sequence:
"Queuing audio chunk, length: [number]"
"Playing queued audio, chunks: [number]"
"Playing audio chunk, duration: [seconds]"
"Audio chunk finished"
```

## Common Fixes

### Fix 1: Audio Context Suspended
```javascript
// Click anywhere on page first, then:
if (audioContext.state === 'suspended') {
  await audioContext.resume()
}
```

### Fix 2: Incorrect Audio Format
The issue might be that OpenAI sends audio in a different format. Try:
1. Check if audio data starts with known headers (WAV, MP3)
2. Try different sample rates (16kHz, 24kHz, 48kHz)
3. Verify mono vs stereo channel configuration

### Fix 3: Browser Compatibility
- **Chrome/Edge**: Usually works best
- **Firefox**: May need additional permissions
- **Safari**: Requires user interaction for audio

### Fix 4: HTTPS Requirement
- Realtime API requires HTTPS in production
- Use `localhost` for development
- Ensure secure WebSocket connection

## Environment Checklist

- [ ] OpenAI API key with Realtime access
- [ ] HTTPS connection (or localhost)
- [ ] Modern browser (Chrome 66+, Firefox 60+, Safari 11.1+)
- [ ] Microphone permissions granted
- [ ] Audio output device connected
- [ ] System volume > 0
- [ ] No other audio applications blocking

## Advanced Debugging

### Enable Verbose Logging
```bash
# In backend .env file:
LOG_LEVEL=debug
```

### Monitor WebSocket Messages
```javascript
// In browser DevTools Network tab:
// Filter by "WS" to see WebSocket messages
// Look for audio.delta messages from OpenAI
```

### Test with Different Audio Formats
```javascript
// Try forcing different output formats in backend:
output_audio_format: 'mp3'  // instead of 'pcm16'
```

## Known Issues

1. **TypeScript Errors**: Some type mismatches in audio processing (non-blocking)
2. **Safari Limitations**: Requires user gesture for audio playback
3. **Firefox Audio Context**: May need manual resume after page load
4. **Mobile Browsers**: Limited Web Audio API support

## Alternative Solutions

If realtime audio still doesn't work:

1. **Use Traditional Mode**: Switch back to STT→LLM→TTS pipeline
2. **Check Network**: Try different internet connection
3. **Update Browser**: Ensure latest version
4. **Clear Cache**: Reset browser audio permissions

## Getting Help

If issues persist:
1. Check browser console for specific error messages
2. Verify OpenAI API status and quotas
3. Test with different audio devices
4. Try incognito/private browsing mode
