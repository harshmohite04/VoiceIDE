"""
Base IDE Integration Interface.

This module defines the abstract base class for IDE integrations.
Specific IDE implementations should inherit from this class.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
import logging

logger = logging.getLogger(__name__)

class BaseIDE(ABC):
    """Abstract base class for IDE integrations."""
    
    @abstractmethod
    def send_instruction(self, instruction: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Send an instruction to the IDE's AI.
        
        Args:
            instruction: The natural language instruction to send.
            context: Additional context for the instruction.
            
        Returns:
            A dictionary containing the response and any metadata.
        """
        pass
    
    @abstractmethod
    def get_editor_state(self) -> Dict[str, Any]:
        """Get the current state of the editor.
        
        Returns:
            A dictionary containing information about the current file, cursor position, etc.
        """
        pass
    
    @abstractmethod
    def apply_changes(self, changes: List[Dict[str, Any]]) -> bool:
        """Apply a set of changes to the code.
        
        Args:
            changes: A list of changes to apply, where each change is a dictionary
                    with keys like 'file', 'line', 'content', etc.
                    
        Returns:
            True if all changes were applied successfully, False otherwise.
        """
        pass
    
    @abstractmethod
    def get_available_actions(self) -> List[str]:
        """Get a list of available actions/commands in the IDE.
        
        Returns:
            A list of action names that can be performed.
        """
        pass
    
    @abstractmethod
    def execute_action(self, action_name: str, params: Optional[Dict[str, Any]] = None) -> bool:
        """Execute a specific IDE action.
        
        Args:
            action_name: The name of the action to execute.
            params: Optional parameters for the action.
            
        Returns:
            True if the action was executed successfully, False otherwise.
        """
        pass
    
    @abstractmethod
    def get_open_files(self) -> List[Dict[str, Any]]:
        """Get a list of currently open files.
        
        Returns:
            A list of dictionaries containing file information.
        """
        pass
    
    @abstractmethod
    def open_file(self, file_path: str) -> bool:
        """Open a file in the IDE.
        
        Args:
            file_path: The path to the file to open.
            
        Returns:
            True if the file was opened successfully, False otherwise.
        """
        pass
    
    @abstractmethod
    def get_file_content(self, file_path: str) -> Optional[str]:
        """Get the content of a file.
        
        Args:
            file_path: The path to the file.
            
        Returns:
            The content of the file as a string, or None if the file doesn't exist.
        """
        pass
    
    @abstractmethod
    def save_file(self, file_path: str, content: str) -> bool:
        """Save content to a file.
        
        Args:
            file_path: The path to the file to save.
            content: The content to write to the file.
            
        Returns:
            True if the file was saved successfully, False otherwise.
        """
        pass
    
    def format_code(self, code: str, language: str) -> str:
        """Format code using the IDE's formatter.
        
        Args:
            code: The code to format.
            language: The programming language of the code.
            
        Returns:
            The formatted code.
        """
        # Default implementation returns the code as-is
        return code
    
    def get_suggestions(self, prefix: str) -> List[str]:
        """Get code completion suggestions.
        
        Args:
            prefix: The text prefix to get suggestions for.
            
        Returns:
            A list of possible completions.
        """
        return []
    
    def get_diagnostics(self) -> List[Dict[str, Any]]:
        """Get a list of diagnostics (errors, warnings, etc.) for the current file.
        
        Returns:
            A list of diagnostic objects.
        """
        return []
    
    def get_definition(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get the definition location of a symbol.
        
        Args:
            symbol: The symbol to find the definition of.
            
        Returns:
            A dictionary with the file path and position of the definition, or None if not found.
        """
        return None
    
    def get_references(self, symbol: str) -> List[Dict[str, Any]]:
        """Get all references to a symbol.
        
        Args:
            symbol: The symbol to find references to.
            
        Returns:
            A list of dictionaries, each containing the file path and position of a reference.
        """
        return []
    
    def get_hover_info(self, position: Dict[str, int]) -> Optional[Dict[str, Any]]:
        """Get hover information for the symbol at the given position.
        
        Args:
            position: A dictionary with 'line' and 'character' keys specifying the position.
            
        Returns:
            A dictionary containing hover information, or None if not available.
        """
        return None
    
    def get_signature_help(self, position: Dict[str, int]) -> Optional[Dict[str, Any]]:
        """Get signature help for the function/method at the given position.
        
        Args:
            position: A dictionary with 'line' and 'character' keys specifying the position.
            
        Returns:
            A dictionary containing signature help information, or None if not available.
        """
        return None
    
    def get_document_symbols(self, file_path: str) -> List[Dict[str, Any]]:
        """Get all symbols in a document.
        
        Args:
            file_path: The path to the file.
            
        Returns:
            A list of symbols in the document.
        """
        return []
    
    def get_workspace_symbols(self, query: str = "") -> List[Dict[str, Any]]:
        """Search for symbols in the workspace.
        
        Args:
            query: The search query.
            
        Returns:
            A list of matching symbols.
        """
        return []
    
    def execute_command(self, command: str, args: Optional[List[Any]] = None) -> Any:
        """Execute a custom command in the IDE.
        
        Args:
            command: The command to execute.
            args: Optional arguments for the command.
            
        Returns:
            The result of the command, or None if the command failed.
        """
        return None
