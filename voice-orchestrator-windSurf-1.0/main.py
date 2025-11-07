#!/usr/bin/env python3
"""
Voice IDE Orchestrator - Main Application
"""
import os
import logging
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path

from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.logging import RichHandler
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    datefmt="[%X]",
    handlers=[RichHandler(rich_tracebacks=True, show_path=False)]
)
logger = logging.getLogger("voice_ide")

# Load environment variables
load_dotenv()

class VoiceIDE:
    def __init__(self):
        self.console = Console()
        self.running = False
        self.current_task: Optional[Dict[str, Any]] = None
        self.task_queue: List[Dict[str, Any]] = []
        self.history: List[Dict[str, Any]] = []
        self.setup_workspace()

    def setup_workspace(self):
        """Initialize workspace directories and files."""
        self.workspace_dir = Path(".voice_ide")
        self.workspace_dir.mkdir(exist_ok=True)
        
        self.tasks_file = self.workspace_dir / "tasks.json"
        self.history_file = self.workspace_dir / "history.json"
        
        # Load previous state if exists
        self.load_state()

    def load_state(self):
        """Load tasks and history from previous session."""
        try:
            if self.tasks_file.exists():
                with open(self.tasks_file, 'r') as f:
                    self.task_queue = json.load(f)
                    logger.info(f"Loaded {len(self.task_queue)} pending tasks")
            
            if self.history_file.exists():
                with open(self.history_file, 'r') as f:
                    self.history = json.load(f)
                    logger.info(f"Loaded {len(self.history)} history items")
        except Exception as e:
            logger.warning(f"Failed to load previous state: {e}")

    def save_state(self):
        """Save current state to disk."""
        try:
            with open(self.tasks_file, 'w') as f:
                json.dump(self.task_queue, f, indent=2)
            
            # Keep only last 100 history items
            recent_history = self.history[-100:]
            with open(self.history_file, 'w') as f:
                json.dump(recent_history, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save state: {e}")

    def display_banner(self):
        """Display the welcome banner with version and status."""
        version = "1.0.0"
        tasks_count = len(self.task_queue)
        
        banner = f"""
        [bold blue]╔══════════════════════════════════════════╗
        ║      Voice IDE Orchestrator v{version}      ║
        ╚══════════════════════════════════════════╝[/bold blue]
        [dim]Type 'help' for commands or speak naturally to start coding
        [yellow]Tasks in queue: {tasks_count}[/yellow][/dim]
        """
        self.console.print(Panel.fit(banner, style="blue"))

    def start(self):
        """Start the Voice IDE Orchestrator main loop."""
        self.running = True
        self.display_banner()
        
        try:
            while self.running:
                try:
                    # Get user input with prompt showing current task status
                    status = self.get_status()
                    prompt = f"\n[bold cyan]You ({status}):[/bold cyan] "
                    user_input = self.console.input(prompt).strip()
                    
                    if not user_input:
                        continue
                        
                    # Process commands
                    if user_input.lower() in ('exit', 'quit'):
                        if self.confirm_exit():
                            self.running = False
                        continue
                        
                    if user_input.lower() in ('help', '?'):
                        self.show_help()
                        continue
                        
                    if user_input.lower() in ('status', 'what\'s going on'):
                        self.show_status()
                        continue
                        
                    if user_input.lower() in ('clear', 'cls'):
                        self.console.clear()
                        self.display_banner()
                        continue
                    
                    # Process natural language command
                    self.process_command(user_input)
                    
                except KeyboardInterrupt:
                    if not self.confirm_exit():
                        continue
                    self.running = False
                    
                except Exception as e:
                    logger.error(f"Error: {str(e)}")
                    
        except Exception as e:
            logger.critical(f"Fatal error: {e}", exc_info=True)
        finally:
            self.shutdown()

    def get_status(self) -> str:
        """Get current status indicator."""
        if self.current_task:
            return f"working on: {self.current_task.get('description', 'task')[:20]}..."
        elif self.task_queue:
            return f"{len(self.task_queue)} tasks queued"
        return "ready"

    def confirm_exit(self) -> bool:
        """Confirm before exiting if there are pending tasks."""
        if self.task_queue or self.current_task:
            confirm = self.console.input(
                "[yellow]You have pending tasks. Are you sure you want to quit? (y/N):[/yellow] "
            ).lower()
            return confirm == 'y'
        return True

    def process_command(self, command: str):
        """Process a natural language command."""
        with self.console.status("[bold green]Processing command...") as status:
            # Log the command
            self.history.append({
                "timestamp": datetime.now().isoformat(),
                "command": command,
                "type": "user_input"
            })
            
            # Create and queue the task
            task = self.create_task(command)
            self.task_queue.append(task)
            
            # Process the task if none is running
            if not self.current_task:
                self.process_next_task()
            else:
                self.console.print(
                    f"[dim]Queued task: {command[:50]}{'...' if len(command) > 50 else ''}[/dim]"
                )

    def create_task(self, description: str) -> Dict[str, Any]:
        """Create a new task from a command."""
        task_id = f"task_{len(self.history) + 1}"
        return {
            "id": task_id,
            "description": description,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "metadata": {
                "type": "code_change",
                "complexity": self.estimate_complexity(description)
            }
        }
    
    def estimate_complexity(self, description: str) -> str:
        """Estimate task complexity based on description."""
        description = description.lower()
        if any(word in description for word in ["simple", "add", "update", "fix"]):
            return "low"
        elif any(word in description for word in ["implement", "create", "refactor"]):
            return "medium"
        elif any(word in description for word in ["rewrite", "migrate", "redesign"]):
            return "high"
        return "unknown"
        
    def process_next_task(self):
        """Process the next task in the queue."""
        if not self.task_queue:
            self.current_task = None
            return
            
        self.current_task = self.task_queue.pop(0)
        self.current_task["status"] = "in_progress"
        self.current_task["started_at"] = datetime.now().isoformat()
        
        try:
            # Show task progress
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                transient=True,
                console=self.console
            ) as progress:
                task_progress = progress.add_task(
                    f"[cyan]Processing: {self.current_task['description']}",
                    total=100
                )
                
                # Simulate work with progress updates
                for i in range(5):
                    progress.update(task_progress, advance=20)
                    self.simulate_work(0.2)
                    if not self.running:
                        return
            
            # Mark task as completed
            self.current_task["status"] = "completed"
            self.current_task["completed_at"] = datetime.now().isoformat()
            self.current_task["result"] = {
                "message": "Task completed successfully",
                "changes": ["Simulated changes"]
            }
            
            # Log completion
            self.history.append({
                "timestamp": datetime.now().isoformat(),
                "task": self.current_task,
                "type": "task_completed"
            })
            
            self.console.print(
                f"[green]✓ Task completed: {self.current_task['description']}[/green]"
            )
            
        except Exception as e:
            self.current_task["status"] = "failed"
            self.current_task["error"] = str(e)
            logger.error(f"Task failed: {str(e)}")
            
            # Log failure
            self.history.append({
                "timestamp": datetime.now().isoformat(),
                "task": self.current_task,
                "error": str(e),
                "type": "task_failed"
            })
            
        finally:
            # Save state and process next task
            self.save_state()
            self.process_next_task()
    
    def simulate_work(self, duration: float):
        """Simulate work being done."""
        import time
        time.sleep(duration)

    def show_help(self):
        """Display help information."""
        help_text = """
        [bold]Available Commands:[/bold]
        • [cyan]help[/cyan] - Show this help message
        • [cyan]status[/cyan] - Show current task status
        • [cyan]clear[/cyan] - Clear the screen
        • [cyan]exit[/cyan] or [cyan]quit[/cyan] - Exit the program
        
        [bold]Voice Commands:[/bold]
        • Speak naturally to give coding instructions
        • "What's going on?" - Check current task status
        • "Stop" - Cancel current operation
        
        [bold]Examples:[/bold]
        • "Create a login page with email and password fields"
        • "Fix the layout issue on mobile view"
        • "Add form validation to the contact form"
        """
        self.console.print(Panel.fit(help_text, title="Help", border_style="blue"))
    
    def show_status(self):
        """Show current task status and queue."""
        status_table = Table(show_header=True, header_style="bold magenta")
        status_table.add_column("Status", width=12)
        status_table.add_column("Description")
        
        if self.current_task:
            status_table.add_row(
                "[yellow]In Progress[/yellow]",
                self.current_task["description"]
            )
        
        for i, task in enumerate(self.task_queue[:5], 1):
            status_table.add_row(
                f"[dim]Queued #{i}[/dim]",
                task["description"]
            )
        
        if len(self.task_queue) > 5:
            status_table.add_row(
                "[dim]...[/dim]",
                f"[dim]and {len(self.task_queue) - 5} more tasks[/dim]"
            )
        
        self.console.print(Panel.fit(
            status_table,
            title="Task Status",
            border_style="blue"
        ))
    
    def shutdown(self):
        """Clean up before exiting."""
        self.console.print("\n[bold]Shutting down...[/bold]")
        
        # Save state
        self.save_state()
        
        # Show summary
        completed = sum(1 for t in self.history if t.get("type") == "task_completed")
        failed = sum(1 for t in self.history if t.get("type") == "task_failed")
        
        summary = f"""
        [bold]Session Summary:[/bold]
        • Tasks completed: [green]{completed}[/green]
        • Tasks failed: [red]{failed}[/red]
        • Total commands: {len(self.history)}
        """
        
        self.console.print(Panel.fit(summary, border_style="blue"))
        self.console.print("[bold green]👋 Goodbye![/bold green]")


def main():
    """Main entry point."""
    try:
        app = VoiceIDE()
        app.start()
    except Exception as e:
        logger.critical(f"Fatal error: {e}", exc_info=True)
        return 1
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
