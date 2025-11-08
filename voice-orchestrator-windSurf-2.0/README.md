# Voice Orchestrator - AI Assistant for IDEs

A voice-powered AI assistant extension for Windsurf and Cursor IDEs that acts as your "Jarvis for coding". This extension enables natural voice conversations with an AI assistant that can help with code discussions, task planning, and IDE automation.

## 🎯 Features

- **Voice Recognition**: Speech-to-text using Azure Cognitive Services
- **AI Conversations**: Natural language discussions about your code using OpenAI GPT models
- **Task Planning**: Automatic breakdown of complex coding tasks into actionable steps
- **IDE Integration**: Seamless integration with Windsurf and Cursor IDEs
- **Code Generation**: AI-generated code snippets with smart insertion options
- **Context Awareness**: Understands your current workspace, files, and recent actions
- **Text-to-Speech**: AI responses can be spoken back to you
- **Background Operation**: Non-intrusive operation that doesn't interrupt your workflow

## 🚀 Quick Start

### Prerequisites

1. **OpenAI API**: Get your API key from [OpenAI Platform](https://platform.openai.com)
   - Used for both AI conversations and voice recognition (Whisper) + text-to-speech

### Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd voice-orchestrator-windSurf-2.0
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your API keys:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. Build the extension:
   ```bash
   npm run build
   ```

5. Package for your IDE:
   ```bash
   # For Windsurf
   npm run package:windsurf
   
   # For Cursor
   npm run package:cursor
   ```

### Configuration

Set up your API credentials in VS Code settings or environment variables:

```json
{
  "voiceOrchestrator.openaiApiKey": "your-openai-api-key",
  "voiceOrchestrator.voiceLanguage": "en-US",
  "voiceOrchestrator.aiModel": "gpt-4"
}
```

## 🎮 Usage

### Basic Commands

- **Start Voice Assistant**: `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac)
- **Stop Voice Assistant**: Command palette → "Stop Voice Assistant"
- **Toggle Mute**: Command palette → "Toggle Voice Assistant Mute"

### Voice Interactions

Once activated, you can speak naturally to your AI assistant:

- **"Explain this function"** - Get explanations about your current code
- **"Create a React component for user authentication"** - Generate code with task planning
- **"How do I fix this error?"** - Get debugging help
- **"Refactor this code to use async/await"** - Get refactoring suggestions
- **"What's the best way to handle state in this component?"** - Get architectural advice

### Task Planning

The assistant automatically creates task plans for complex requests:

1. **Voice Input**: "Create a REST API with authentication"
2. **AI Analysis**: The AI breaks down the task into steps
3. **Task Plan**: You get a structured plan with actionable steps
4. **Execution**: Choose to execute steps automatically or manually

## 🏗️ Architecture

```
Voice Orchestrator
├── Voice Recognition Service (OpenAI Whisper)
├── AI Conversation Service (OpenAI GPT)
├── Context Manager (Workspace awareness)
├── Task Planning Service (Task breakdown)
└── IDE Integration Service (Code operations)
```

### Core Components

- **VoiceOrchestrator**: Main orchestration class
- **VoiceRecognitionService**: Handles speech-to-text and text-to-speech
- **AIConversationService**: Manages conversations with OpenAI
- **ContextManager**: Maintains conversation and workspace context
- **TaskPlanningService**: Creates and manages task plans
- **IDEIntegrationService**: Handles IDE operations and code manipulation

## 🔧 Development

### Project Structure

```
src/
├── core/
│   └── VoiceOrchestrator.ts
├── services/
│   ├── VoiceRecognitionService.ts
│   ├── AIConversationService.ts
│   ├── ContextManager.ts
│   ├── TaskPlanningService.ts
│   └── IDEIntegrationService.ts
├── utils/
│   └── Logger.ts
└── index.ts
```

### Building

```bash
# Development build
npm run dev

# Production build
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### Extending

The extension is designed to be modular and extensible:

1. **Add new voice commands**: Extend the `AIConversationService`
2. **Add new IDE operations**: Extend the `IDEIntegrationService`
3. **Add new task types**: Extend the `TaskPlanningService`
4. **Add new context sources**: Extend the `ContextManager`

## 🔒 Privacy & Security

- **Local Processing**: Voice processing happens locally when possible
- **Secure API Calls**: All API communications use HTTPS
- **No Data Storage**: Conversations are not permanently stored
- **Configurable**: You control what data is sent to external services

## 🐛 Troubleshooting

### Common Issues

1. **Voice not recognized**:
   - Check microphone permissions
   - Verify Azure Speech Service credentials
   - Ensure stable internet connection

2. **AI not responding**:
   - Verify OpenAI API key
   - Check API quota and billing
   - Review network connectivity

3. **Extension not loading**:
   - Check VS Code version compatibility
   - Verify all dependencies are installed
   - Check the extension logs

### Debug Mode

Enable debug logging in your settings:

```json
{
  "voiceOrchestrator.debugMode": true
}
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Documentation**: [Wiki](https://github.com/your-repo/wiki)

## 🎉 Acknowledgments

- OpenAI for conversational AI
- VS Code extension API
- The open-source community

---

**Made with ❤️ for developers who want to code by voice**

## 🎉 TECHNICAL STACK:
- TypeScript/Node.js foundation
- OpenAI Whisper for speech recognition
- OpenAI GPT for conversations
- OpenAI TTS for speech synthesis
- VS Code Extension API
- Modern web technologies for UI

---

**Made with ❤️ for developers who want to code by voice**
