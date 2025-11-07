# Install Node.js dependencies
npm install

# Install TypeScript and VS Code types
npm install --save-dev typescript @types/node @types/vscode

# Install other development dependencies
npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint @vscode/vsce

# Create necessary directories
New-Item -ItemType Directory -Force -Path "./out" | Out-Null

Write-Host "Setup complete! Run 'npm run compile' to build the extension." -ForegroundColor Green
