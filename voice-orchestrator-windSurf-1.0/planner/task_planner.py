"""
Task Planning Module for Voice IDE Orchestrator.

This module handles breaking down high-level user commands into actionable tasks
that can be executed by the IDE's AI.
"""
from typing import List, Dict, Any, Optional
import logging
import json
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class Task:
    """Represents a single task in the execution pipeline."""
    id: str
    description: str
    status: TaskStatus = TaskStatus.PENDING
    result: Optional[Any] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the task to a dictionary."""
        return {
            "id": self.id,
            "description": self.description,
            "status": self.status.value,
            "result": self.result,
            "error": self.error,
            "metadata": self.metadata or {}
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Task':
        """Create a Task from a dictionary."""
        return cls(
            id=data['id'],
            description=data['description'],
            status=TaskStatus(data.get('status', TaskStatus.PENDING.value)),
            result=data.get('result'),
            error=data.get('error'),
            metadata=data.get('metadata')
        )

class TaskPlanner:
    """Handles breaking down high-level commands into executable tasks."""
    
    def __init__(self):
        self.tasks: Dict[str, Task] = {}
        self.current_task_id: Optional[str] = None
    
    def create_task(self, description: str, metadata: Optional[Dict] = None) -> Task:
        """Create a new task with a unique ID."""
        task_id = f"task_{len(self.tasks) + 1}"
        task = Task(
            id=task_id,
            description=description,
            metadata=metadata or {}
        )
        self.tasks[task_id] = task
        return task
    
    def get_task(self, task_id: str) -> Optional[Task]:
        """Get a task by its ID."""
        return self.tasks.get(task_id)
    
    def update_task_status(self, task_id: str, status: TaskStatus, 
                         result: Any = None, error: Optional[str] = None) -> bool:
        """Update the status of a task."""
        if task_id not in self.tasks:
            logger.warning(f"Task {task_id} not found")
            return False
            
        task = self.tasks[task_id]
        task.status = status
        task.result = result
        task.error = error
        return True
    
    def plan_tasks(self, command: str) -> List[Task]:
        """Break down a high-level command into executable tasks.
        
        This is a simplified version that would be enhanced with AI in production.
        """
        command = command.lower()
        tasks = []
        
        # Simple keyword-based task planning
        if "login" in command and ("layout" in command or "style" in command):
            tasks = [
                self.create_task(
                    "Locate login page files",
                    {"type": "file_discovery", "patterns": ["*login*.{js,jsx,ts,tsx,html,css,scss}"]}
                ),
                self.create_task(
                    "Analyze current layout structure",
                    {"type": "code_analysis", "target": "login_component"}
                ),
                self.create_task(
                    "Update CSS for modern styling",
                    {"type": "code_modification", "target": "login_styles"}
                ),
                self.create_task(
                    "Ensure responsive design",
                    {"type": "code_modification", "target": "responsive_design"}
                ),
                self.create_task(
                    "Test across different screen sizes",
                    {"type": "testing", "target": "responsive_testing"}
                )
            ]
        elif "api" in command and ("add" in command or "create" in command):
            tasks = [
                self.create_task(
                    "Identify API endpoint requirements",
                    {"type": "analysis", "target": "api_requirements"}
                ),
                self.create_task(
                    "Create API endpoint implementation",
                    {"type": "code_creation", "target": "api_implementation"}
                ),
                self.create_task(
                    "Add input validation",
                    {"type": "code_modification", "target": "input_validation"}
                ),
                self.create_task(
                    "Write unit tests",
                    {"type": "testing", "target": "unit_tests"}
                )
            ]
        else:
            # Default task for unrecognized commands
            tasks = [
                self.create_task(
                    f"Process command: {command}",
                    {"type": "general", "command": command}
                )
            ]
        
        # Set the first task as current
        if tasks:
            self.current_task_id = tasks[0].id
            
        return tasks
    
    def get_current_task(self) -> Optional[Task]:
        """Get the currently active task."""
        if not self.current_task_id:
            return None
        return self.get_task(self.current_task_id)
    
    def complete_current_task(self, result: Any = None) -> Optional[Task]:
        """Mark the current task as completed and move to the next one."""
        if not self.current_task_id:
            return None
            
        self.update_task_status(
            self.current_task_id, 
            TaskStatus.COMPLETED,
            result=result
        )
        
        # Find the next pending task
        current_idx = -1
        task_list = list(self.tasks.values())
        
        for i, task in enumerate(task_list):
            if task.id == self.current_task_id:
                current_idx = i
                break
        
        next_task = None
        for task in task_list[current_idx + 1:]:
            if task.status == TaskStatus.PENDING:
                next_task = task
                break
        
        self.current_task_id = next_task.id if next_task else None
        return next_task
    
    def get_status_summary(self) -> Dict[str, Any]:
        """Get a summary of all tasks and their statuses."""
        return {
            "total_tasks": len(self.tasks),
            "completed": sum(1 for t in self.tasks.values() if t.status == TaskStatus.COMPLETED),
            "in_progress": sum(1 for t in self.tasks.values() if t.status == TaskStatus.IN_PROGRESS),
            "pending": sum(1 for t in self.tasks.values() if t.status == TaskStatus.PENDING),
            "current_task": self.current_task_id,
            "tasks": [t.to_dict() for t in self.tasks.values()]
        }
    
    def clear_completed_tasks(self) -> None:
        """Remove completed tasks to free up memory."""
        completed_ids = [
            task_id for task_id, task in self.tasks.items()
            if task.status == TaskStatus.COMPLETED
        ]
        
        for task_id in completed_ids:
            if self.current_task_id == task_id:
                self.current_task_id = None
            del self.tasks[task_id]
        
        logger.info(f"Cleared {len(completed_ids)} completed tasks")


# Example usage
if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    
    planner = TaskPlanner()
    
    # Example command processing
    command = "Fix the layout issue on the login page and make it look more modern"
    print(f"Processing command: {command}")
    
    tasks = planner.plan_tasks(command)
    print(f"\nPlanned {len(tasks)} tasks:")
    for task in tasks:
        print(f"- {task.description}")
    
    # Simulate task execution
    print("\nSimulating task execution...")
    for task in tasks:
        print(f"\nExecuting: {task.description}")
        planner.update_task_status(task.id, TaskStatus.IN_PROGRESS)
        # Simulate work
        import time
        time.sleep(0.5)
        planner.complete_current_task("Task completed successfully")
    
    # Print final status
    print("\nFinal status:")
    print(json.dumps(planner.get_status_summary(), indent=2))
