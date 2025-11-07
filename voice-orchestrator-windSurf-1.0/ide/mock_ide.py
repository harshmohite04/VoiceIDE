"""
Mock IDE Implementation for testing and development.

This module provides a mock implementation of the BaseIDE interface
that simulates an IDE's behavior without requiring an actual IDE.
"""
import os
import random
import time
from typing import Dict, Any, List, Optional
import logging
from pathlib import Path

from .base_ide import BaseIDE

logger = logging.getLogger(__name__)

class MockIDE(BaseIDE):
    """Mock implementation of the BaseIDE interface for testing."""
    
    def __init__(self, workspace_root: str = None):
        """Initialize the mock IDE.
        
        Args:
            workspace_root: The root directory of the workspace.
        """
        self.workspace_root = workspace_root or os.getcwd()
        self.open_files = []
        self.current_file = None
        self.current_position = {"line": 0, "character": 0}
        self.mock_responses = self._load_mock_responses()
        
        # Create a simple mock file system
        self.mock_fs = {
            "files": {},
            "last_modified": {}
        }
        
        # Initialize with some sample files if the workspace exists
        if os.path.exists(self.workspace_root):
            self._index_workspace()
    
    def _load_mock_responses(self) -> Dict[str, List[str]]:
        """Load mock responses for various commands."""
        return {
            "fix": [
                "I've fixed the issue with the login page layout. The changes include updating the CSS for better spacing and alignment.",
                "The layout issue has been resolved. I've made the login form more responsive and improved the button styling.",
                "I've updated the login page with a more modern design. The changes include a cleaner layout and better visual hierarchy."
            ],
            "create": [
                "I've created a new component with the specified functionality. The code follows best practices and includes proper error handling.",
                "The new feature has been implemented. I've added comprehensive documentation and basic tests.",
                "I've set up the requested functionality. The implementation includes type definitions and proper state management."
            ],
            "refactor": [
                "I've refactored the code to improve readability and maintainability. The functionality remains the same.",
                "The code has been restructured to follow better architectural patterns. I've also updated the documentation.",
                "I've optimized the code for better performance. The changes include reducing redundancy and improving algorithm efficiency."
            ],
            "test": [
                "I've added unit tests for the specified functionality. The test coverage is now at 85%.",
                "The test suite has been updated to include the new features. All tests are passing.",
                "I've written integration tests to verify the component interactions. The test coverage report has been generated."
            ],
            "debug": [
                "I've identified and fixed the issue. The problem was caused by an unhandled edge case in the validation logic.",
                "The bug has been resolved. I've added additional logging to help with future debugging.",
                "I've fixed the error by addressing the root cause. The solution includes proper error handling to prevent similar issues."
            ]
        }
    
    def _index_workspace(self):
        """Index the workspace to create a mock file system."""
        for root, _, files in os.walk(self.workspace_root):
            for file in files:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, self.workspace_root)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    self.mock_fs["files"][rel_path] = content
                    self.mock_fs["last_modified"][rel_path] = os.path.getmtime(file_path)
                except Exception as e:
                    logger.warning(f"Could not read file {file_path}: {e}")
    
    def _get_random_response(self, intent: str) -> str:
        """Get a random response for a given intent."""
        responses = self.mock_responses.get(intent, [
            f"I've completed the task: {intent}",
            f"The {intent} operation was successful.",
            f"I've processed your request to {intent}."
        ])
        return random.choice(responses)
    
    def send_instruction(self, instruction: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Simulate sending an instruction to the IDE's AI."""
        logger.info(f"Sending instruction to mock IDE: {instruction}")
        
        # Simulate processing time
        time.sleep(0.5 + random.random())
        
        # Determine intent based on keywords
        intent = "general"
        instruction_lower = instruction.lower()
        
        if any(word in instruction_lower for word in ["fix", "correct", "resolve"]):
            intent = "fix"
        elif any(word in instruction_lower for word in ["create", "add", "new"]):
            intent = "create"
        elif any(word in instruction_lower for word in ["refactor", "improve", "clean up"]):
            intent = "refactor"
        elif any(word in instruction_lower for word in ["test", "coverage"]):
            intent = "test"
        elif any(word in instruction_lower for word in ["debug", "error", "bug"]):
            intent = "debug"
        
        response = self._get_random_response(intent)
        
        return {
            "success": True,
            "response": response,
            "changes": [],
            "metadata": {
                "intent": intent,
                "processing_time": round(random.uniform(0.5, 2.5), 2),
                "timestamp": time.time()
            }
        }
    
    def get_editor_state(self) -> Dict[str, Any]:
        """Get the current state of the mock editor."""
        return {
            "current_file": self.current_file,
            "cursor_position": self.current_position,
            "open_files": self.open_files,
            "workspace_root": self.workspace_root
        }
    
    def apply_changes(self, changes: List[Dict[str, Any]]) -> bool:
        """Simulate applying changes to files."""
        if not changes:
            return False
            
        for change in changes:
            file_path = change.get('file')
            if not file_path:
                continue
                
            # Make sure the path is relative to the workspace
            if file_path.startswith('/') or ':' in file_path:
                file_path = os.path.relpath(file_path, self.workspace_root)
            
            # Update the mock file system
            if 'content' in change:
                self.mock_fs["files"][file_path] = change['content']
                self.mock_fs["last_modified"][file_path] = time.time()
                
                logger.info(f"Applied changes to {file_path}")
        
        return True
    
    def get_available_actions(self) -> List[str]:
        """Get a list of available mock actions."""
        return [
            "save", "undo", "redo", "format", "rename", "find", 
            "replace", "go to definition", "find references", "format document"
        ]
    
    def execute_action(self, action_name: str, params: Optional[Dict[str, Any]] = None) -> bool:
        """Simulate executing an IDE action."""
        logger.info(f"Executing mock action: {action_name} with params: {params}")
        time.sleep(0.2)  # Simulate action taking time
        return True
    
    def get_open_files(self) -> List[Dict[str, Any]]:
        """Get a list of mock open files."""
        return [{"path": f, "language": "python"} for f in self.open_files]
    
    def open_file(self, file_path: str) -> bool:
        """Simulate opening a file in the IDE."""
        if file_path not in self.open_files:
            self.open_files.append(file_path)
        self.current_file = file_path
        self.current_position = {"line": 0, "character": 0}
        return True
    
    def get_file_content(self, file_path: str) -> Optional[str]:
        """Get the content of a file from the mock file system."""
        # Make sure the path is relative to the workspace
        if file_path.startswith('/') or ':' in file_path:
            file_path = os.path.relpath(file_path, self.workspace_root)
        
        return self.mock_fs["files"].get(file_path)
    
    def save_file(self, file_path: str, content: str) -> bool:
        """Save content to a file in the mock file system."""
        # Make sure the path is relative to the workspace
        if file_path.startswith('/') or ':' in file_path:
            file_path = os.path.relpath(file_path, self.workspace_root)
        
        self.mock_fs["files"][file_path] = content
        self.mock_fs["last_modified"][file_path] = time.time()
        return True
    
    def format_code(self, code: str, language: str) -> str:
        """Simulate code formatting."""
        # Just return the code as-is for the mock implementation
        return code
    
    def get_suggestions(self, prefix: str) -> List[str]:
        """Get mock code completion suggestions."""
        suggestions = {
            "import": ["os", "sys", "json", "typing"],
            "def ": ["main():", "test_"],
            "class ": ["MyClass:", "Test"],
            "self.": ["method1()", "attribute1", "method2()"],
        }
        
        for key, values in suggestions.items():
            if prefix.lower().endswith(key.lower()):
                return values
                
        return []
    
    def get_diagnostics(self) -> List[Dict[str, Any]]:
        """Get mock diagnostics."""
        if not self.current_file:
            return []
            
        # Return a random number of mock diagnostics
        num_diagnostics = random.randint(0, 3)
        if num_diagnostics == 0:
            return []
            
        severities = ["error", "warning", "information", "hint"]
        messages = [
            "Unused import 'os'",
            "Expected 2 blank lines, found 1",
            "Line too long (120/100)",
            "Undefined variable 'foo'",
            "Function is too complex (15/10)"
        ]
        
        diagnostics = []
        for _ in range(num_diagnostics):
            line = random.randint(1, 50)
            character = random.randint(0, 40)
            
            diagnostics.append({
                "range": {
                    "start": {"line": line, "character": character},
                    "end": {"line": line, "character": character + 5}
                },
                "severity": random.choice(severities),
                "message": random.choice(messages),
                "source": "pylint"
            })
            
        return diagnostics
    
    def get_definition(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get mock definition location."""
        if not self.current_file:
            return None
            
        # Return a mock definition location
        return {
            "file": self.current_file,
            "range": {
                "start": {"line": 10, "character": 0},
                "end": {"line": 15, "character": 0}
            }
        }
    
    def get_references(self, symbol: str) -> List[Dict[str, Any]]:
        """Get mock references to a symbol."""
        if not self.current_file:
            return []
            
        # Return a few mock references
        return [
            {
                "file": self.current_file,
                "range": {
                    "start": {"line": 5, "character": 10},
                    "end": {"line": 5, "character": 10 + len(symbol)}
                }
            },
            {
                "file": self.current_file,
                "range": {
                    "start": {"line": 20, "character": 5},
                    "end": {"line": 20, "character": 5 + len(symbol)}
                }
            }
        ]
    
    def get_hover_info(self, position: Dict[str, int]) -> Optional[Dict[str, Any]]:
        """Get mock hover information."""
        if not self.current_file:
            return None
            
        # Return mock hover information
        return {
            "contents": [
                {"language": "python", "value": "def example_function(param1: str) -> bool"},
                "This is a mock function that does something useful.\n\nArgs:\n    param1: A string parameter.\n\nReturns:\n    A boolean indicating success or failure."
            ]
        }
    
    def get_signature_help(self, position: Dict[str, int]) -> Optional[Dict[str, Any]]:
        """Get mock signature help."""
        if not self.current_file:
            return None
            
        # Return mock signature help
        return {
            "signatures": [
                {
                    "label": "example_function(param1: str, param2: int = 0) -> bool",
                    "documentation": "This is a mock function with multiple parameters.",
                    "parameters": [
                        {"label": "param1", "documentation": "A string parameter"},
                        {"label": "param2", "documentation": "An optional integer parameter (default: 0)"}
                    ]
                }
            ],
            "activeSignature": 0,
            "activeParameter": 0
        }
    
    def get_document_symbols(self, file_path: str) -> List[Dict[str, Any]]:
        """Get mock document symbols."""
        if not file_path:
            file_path = self.current_file
            if not file_path:
                return []
                
        # Return a few mock symbols
        return [
            {
                "name": "ExampleClass",
                "kind": "class",
                "range": {
                    "start": {"line": 0, "character": 0},
                    "end": {"line": 50, "character": 0}
                },
                "selectionRange": {
                    "start": {"line": 0, "character": 0},
                    "end": {"line": 0, "character": 12}
                },
                "children": [
                    {
                        "name": "__init__",
                        "kind": "method",
                        "range": {
                            "start": {"line": 5, "character": 4},
                            "end": {"line": 10, "character": 4}
                        },
                        "selectionRange": {
                            "start": {"line": 5, "character": 4},
                            "end": {"line": 5, "character": 14}
                        }
                    },
                    {
                        "name": "example_method",
                        "kind": "method",
                        "range": {
                            "start": {"line": 12, "character": 4},
                            "end": {"line": 20, "character": 4}
                        },
                        "selectionRange": {
                            "start": {"line": 12, "character": 4},
                            "end": {"line": 12, "character": 19}
                        }
                    }
                ]
            },
            {
                "name": "example_function",
                "kind": "function",
                "range": {
                    "start": {"line": 25, "character": 0},
                    "end": {"line": 35, "character": 0}
                },
                "selectionRange": {
                    "start": {"line": 25, "character": 0},
                    "end": {"line": 25, "character": 18}
                }
            }
        ]
    
    def get_workspace_symbols(self, query: str = "") -> List[Dict[str, Any]]:
        """Get mock workspace symbols."""
        # Return a few mock workspace symbols
        symbols = [
            {
                "name": "ExampleClass",
                "kind": "class",
                "location": {
                    "uri": f"file://{self.workspace_root}/example.py",
                    "range": {
                        "start": {"line": 0, "character": 0},
                        "end": {"line": 0, "character": 12}
                    }
                }
            },
            {
                "name": "example_function",
                "kind": "function",
                "location": {
                    "uri": f"file://{self.workspace_root}/example.py",
                    "range": {
                        "start": {"line": 25, "character": 0},
                        "end": {"line": 25, "character": 18}
                    }
                }
            },
            {
                "name": "main",
                "kind": "function",
                "location": {
                    "uri": f"file://{self.workspace_root}/main.py",
                    "range": {
                        "start": {"line": 0, "character": 0},
                        "end": {"line": 0, "character": 4}
                    }
                }
            }
        ]
        
        if query:
            query = query.lower()
            return [s for s in symbols if query in s["name"].lower()]
            
        return symbols
    
    def execute_command(self, command: str, args: Optional[List[Any]] = None) -> Any:
        """Execute a mock command."""
        logger.info(f"Executing mock command: {command} with args: {args}")
        time.sleep(0.2)  # Simulate command taking time
        
        # Return mock responses for common commands
        if command == "getWorkspaceFolders":
            return [{"uri": f"file://{self.workspace_root}", "name": "workspace"}]
        elif command == "getConfiguration":
            return {"python.pythonPath": "python", "editor.tabSize": 4}
            
        return None
