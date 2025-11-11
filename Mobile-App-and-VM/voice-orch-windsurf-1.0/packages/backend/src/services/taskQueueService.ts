import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { ProjectSpec, ProjectRequirement } from './requirementsService';

export interface ExecutionTask {
  id: string;
  projectId: string;
  requirementId: string;
  title: string;
  description: string;
  type: 'setup' | 'development' | 'testing' | 'deployment';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked';
  priority: number; // Lower number = higher priority
  dependencies: string[];
  estimatedMinutes: number;
  actualMinutes?: number;
  vmId?: string;
  windsurf: {
    commands: string[];
    files: { path: string; content: string }[];
    expectedOutputs: string[];
  };
  result?: {
    success: boolean;
    output: string;
    artifacts: string[];
    errors: string[];
  };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ExecutionPipeline {
  id: string;
  projectId: string;
  projectName: string;
  status: 'initializing' | 'running' | 'completed' | 'failed' | 'paused';
  tasks: ExecutionTask[];
  vmId?: string;
  progress: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    currentTask?: string;
  };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export class TaskQueueService extends EventEmitter {
  private pipelines: Map<string, ExecutionPipeline> = new Map();
  private runningTasks: Map<string, ExecutionTask> = new Map();

  constructor() {
    super();
  }

  async createExecutionPipeline(projectSpec: ProjectSpec): Promise<ExecutionPipeline> {
    try {
      logger.info(`Creating execution pipeline for project: ${projectSpec.name}`);

      // Convert requirements to executable tasks
      const tasks = await this.generateTasksFromRequirements(projectSpec);
      
      const pipeline: ExecutionPipeline = {
        id: `pipeline_${Date.now()}_${projectSpec.id}`,
        projectId: projectSpec.id,
        projectName: projectSpec.name,
        status: 'initializing',
        tasks: tasks,
        progress: {
          totalTasks: tasks.length,
          completedTasks: 0,
          failedTasks: 0,
        },
        createdAt: new Date(),
      };

      this.pipelines.set(pipeline.id, pipeline);
      
      logger.info(`Created pipeline ${pipeline.id} with ${tasks.length} tasks`);
      this.emit('pipeline-created', pipeline);
      
      return pipeline;

    } catch (error) {
      logger.error('Error creating execution pipeline:', error);
      throw error;
    }
  }

  private async generateTasksFromRequirements(projectSpec: ProjectSpec): Promise<ExecutionTask[]> {
    const tasks: ExecutionTask[] = [];
    let taskIndex = 0;

    // Always start with project setup task
    tasks.push({
      id: `task_${Date.now()}_${taskIndex++}`,
      projectId: projectSpec.id,
      requirementId: 'setup',
      title: 'Project Setup',
      description: 'Initialize project structure and dependencies',
      type: 'setup',
      status: 'pending',
      priority: 0, // Highest priority
      dependencies: [],
      estimatedMinutes: 15,
      windsurf: {
        commands: [
          'mkdir -p /workspace/project',
          'cd /workspace/project',
          'git init',
          'npm init -y',
          ...this.generateSetupCommands(projectSpec.techStack),
        ],
        files: [
          {
            path: '/workspace/project/README.md',
            content: `# ${projectSpec.name}\n\n${projectSpec.description}\n\n## Architecture\n${projectSpec.architecture}\n\n## Tech Stack\n${projectSpec.techStack.join(', ')}`
          },
          {
            path: '/workspace/project/.gitignore',
            content: 'node_modules/\n.env\n.DS_Store\ndist/\nbuild/\n*.log'
          }
        ],
        expectedOutputs: ['package.json created', 'git repository initialized'],
      },
      createdAt: new Date(),
    });

    // Convert each requirement to development tasks
    for (const requirement of projectSpec.requirements) {
      const developmentTask: ExecutionTask = {
        id: `task_${Date.now()}_${taskIndex++}`,
        projectId: projectSpec.id,
        requirementId: requirement.id,
        title: `Develop: ${requirement.title}`,
        description: requirement.description,
        type: 'development',
        status: 'pending',
        priority: this.getPriorityNumber(requirement.priority),
        dependencies: requirement.dependencies.length > 0 ? 
          requirement.dependencies.map(depId => `task_dev_${depId}`) : 
          ['task_setup'],
        estimatedMinutes: requirement.estimatedHours * 60,
        windsurf: await this.generateWindsurfInstructions(requirement, projectSpec),
        createdAt: new Date(),
      };

      tasks.push(developmentTask);

      // Add testing task for each requirement
      if (requirement.acceptanceCriteria.length > 0) {
        tasks.push({
          id: `task_${Date.now()}_${taskIndex++}`,
          projectId: projectSpec.id,
          requirementId: requirement.id,
          title: `Test: ${requirement.title}`,
          description: `Test ${requirement.title} against acceptance criteria`,
          type: 'testing',
          status: 'pending',
          priority: this.getPriorityNumber(requirement.priority) + 1,
          dependencies: [developmentTask.id],
          estimatedMinutes: Math.max(30, requirement.estimatedHours * 15), // 25% of dev time
          windsurf: {
            commands: [
              'npm test',
              'npm run lint',
              'npm run build',
            ],
            files: [],
            expectedOutputs: requirement.acceptanceCriteria,
          },
          createdAt: new Date(),
        });
      }
    }

    // Add final deployment task
    tasks.push({
      id: `task_${Date.now()}_${taskIndex++}`,
      projectId: projectSpec.id,
      requirementId: 'deployment',
      title: 'Deploy Application',
      description: 'Deploy the completed application',
      type: 'deployment',
      status: 'pending',
      priority: 1000, // Lowest priority (runs last)
      dependencies: tasks.filter(t => t.type === 'development').map(t => t.id),
      estimatedMinutes: 30,
      windsurf: {
        commands: [
          'npm run build',
          'npm run start',
        ],
        files: [
          {
            path: '/workspace/project/deploy.sh',
            content: '#!/bin/bash\nnpm install\nnpm run build\nnpm start'
          }
        ],
        expectedOutputs: ['Application deployed successfully', 'Server running'],
      },
      createdAt: new Date(),
    });

    // Sort tasks by priority and dependencies
    return this.sortTasksByDependencies(tasks);
  }

  private generateSetupCommands(techStack: string[]): string[] {
    const commands: string[] = [];
    
    if (techStack.includes('React') || techStack.includes('Next.js')) {
      commands.push('npx create-react-app . --template typescript');
    }
    
    if (techStack.includes('Node.js') || techStack.includes('Express')) {
      commands.push('npm install express cors dotenv');
      commands.push('npm install -D @types/node @types/express nodemon typescript');
    }
    
    if (techStack.includes('PostgreSQL')) {
      commands.push('npm install pg');
      commands.push('npm install -D @types/pg');
    }
    
    if (techStack.includes('MongoDB')) {
      commands.push('npm install mongoose');
    }
    
    return commands;
  }

  private async generateWindsurfInstructions(
    requirement: ProjectRequirement, 
    projectSpec: ProjectSpec
  ): Promise<ExecutionTask['windsurf']> {
    // This would ideally use AI to generate specific Windsurf commands
    // For now, providing template-based generation
    
    const commands: string[] = [];
    const files: { path: string; content: string }[] = [];
    
    switch (requirement.type) {
      case 'frontend':
        commands.push('cd /workspace/project/src');
        commands.push('mkdir -p components pages styles');
        files.push({
          path: `/workspace/project/src/components/${requirement.title.replace(/\s+/g, '')}.tsx`,
          content: `// ${requirement.title}\n// ${requirement.description}\n\nexport default function ${requirement.title.replace(/\s+/g, '')}() {\n  return (\n    <div>\n      <h1>${requirement.title}</h1>\n      {/* TODO: Implement ${requirement.description} */}\n    </div>\n  );\n}`
        });
        break;
        
      case 'backend':
        commands.push('cd /workspace/project');
        commands.push('mkdir -p src/routes src/controllers src/models');
        files.push({
          path: `/workspace/project/src/routes/${requirement.title.toLowerCase().replace(/\s+/g, '-')}.ts`,
          content: `// ${requirement.title}\n// ${requirement.description}\n\nimport express from 'express';\n\nconst router = express.Router();\n\n// TODO: Implement ${requirement.description}\n\nexport default router;`
        });
        break;
        
      case 'api':
        commands.push('cd /workspace/project/src');
        files.push({
          path: `/workspace/project/src/api/${requirement.title.toLowerCase().replace(/\s+/g, '-')}.ts`,
          content: `// ${requirement.title} API\n// ${requirement.description}\n\n// TODO: Implement API endpoints for ${requirement.description}`
        });
        break;
    }
    
    return {
      commands,
      files,
      expectedOutputs: requirement.acceptanceCriteria,
    };
  }

  private getPriorityNumber(priority: string): number {
    switch (priority) {
      case 'high': return 1;
      case 'medium': return 5;
      case 'low': return 10;
      default: return 5;
    }
  }

  private sortTasksByDependencies(tasks: ExecutionTask[]): ExecutionTask[] {
    const sorted: ExecutionTask[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (taskId: string) => {
      if (visiting.has(taskId)) {
        throw new Error(`Circular dependency detected involving task: ${taskId}`);
      }
      
      if (visited.has(taskId)) return;
      
      visiting.add(taskId);
      
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      // Visit dependencies first
      task.dependencies.forEach(depId => {
        visit(depId);
      });
      
      visiting.delete(taskId);
      visited.add(taskId);
      sorted.push(task);
    };
    
    // Visit all tasks
    tasks.forEach(task => {
      if (!visited.has(task.id)) {
        visit(task.id);
      }
    });
    
    return sorted;
  }

  async startPipeline(pipelineId: string, vmId: string): Promise<boolean> {
    try {
      const pipeline = this.pipelines.get(pipelineId);
      if (!pipeline) {
        logger.error(`Pipeline not found: ${pipelineId}`);
        return false;
      }

      pipeline.status = 'running';
      pipeline.vmId = vmId;
      pipeline.startedAt = new Date();
      
      logger.info(`Starting pipeline ${pipelineId} on VM ${vmId}`);
      this.emit('pipeline-started', pipeline);
      
      // Start executing tasks
      this.executeNextTask(pipelineId);
      
      return true;
    } catch (error) {
      logger.error('Error starting pipeline:', error);
      return false;
    }
  }

  private async executeNextTask(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline || pipeline.status !== 'running') return;

    // Find next executable task
    const nextTask = pipeline.tasks.find(task => 
      task.status === 'pending' && 
      task.dependencies.every(depId => 
        pipeline.tasks.find(t => t.id === depId)?.status === 'completed'
      )
    );

    if (!nextTask) {
      // Check if all tasks are completed
      const allCompleted = pipeline.tasks.every(task => 
        task.status === 'completed' || task.status === 'failed'
      );
      
      if (allCompleted) {
        pipeline.status = 'completed';
        pipeline.completedAt = new Date();
        logger.info(`Pipeline ${pipelineId} completed`);
        this.emit('pipeline-completed', pipeline);
      }
      return;
    }

    // Execute the task
    await this.executeTask(nextTask, pipeline);
  }

  private async executeTask(task: ExecutionTask, pipeline: ExecutionPipeline): Promise<void> {
    try {
      task.status = 'running';
      task.startedAt = new Date();
      pipeline.progress.currentTask = task.title;
      
      logger.info(`Executing task: ${task.title}`);
      this.emit('task-started', { task, pipeline });
      
      // Here you would integrate with your VM service to execute Windsurf commands
      // For now, simulating execution
      const result = await this.simulateTaskExecution(task);
      
      if (result) {
        task.result = result;
        task.status = result.success ? 'completed' : 'failed';
        task.completedAt = new Date();
        task.actualMinutes = Math.floor((task.completedAt.getTime() - task.startedAt!.getTime()) / 60000);
        
        if (result.success) {
          pipeline.progress.completedTasks++;
        } else {
          pipeline.progress.failedTasks++;
        }
        
        logger.info(`Task ${task.title} ${result.success ? 'completed' : 'failed'}`);
        this.emit('task-completed', { task, pipeline });
      } else {
        throw new Error('Task execution returned null result');
      }
      
      // Continue with next task
      setTimeout(() => this.executeNextTask(pipeline.id), 1000);
      
    } catch (error) {
      logger.error(`Error executing task ${task.title}:`, error);
      task.status = 'failed';
      task.completedAt = new Date();
      pipeline.progress.failedTasks++;
      
      this.emit('task-failed', { task, pipeline, error });
    }
  }

  private async simulateTaskExecution(task: ExecutionTask): Promise<ExecutionTask['result']> {
    // Simulate task execution - replace with actual VM/Windsurf integration
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: Math.random() > 0.1, // 90% success rate for simulation
          output: `Executed ${task.windsurf.commands.length} commands successfully`,
          artifacts: task.windsurf.files.map(f => f.path),
          errors: [],
        });
      }, Math.random() * 3000 + 1000); // 1-4 second simulation
    });
  }

  getPipeline(pipelineId: string): ExecutionPipeline | undefined {
    return this.pipelines.get(pipelineId);
  }

  getAllPipelines(): ExecutionPipeline[] {
    return Array.from(this.pipelines.values());
  }

  pausePipeline(pipelineId: string): boolean {
    const pipeline = this.pipelines.get(pipelineId);
    if (pipeline && pipeline.status === 'running') {
      pipeline.status = 'paused';
      this.emit('pipeline-paused', pipeline);
      return true;
    }
    return false;
  }

  resumePipeline(pipelineId: string): boolean {
    const pipeline = this.pipelines.get(pipelineId);
    if (pipeline && pipeline.status === 'paused') {
      pipeline.status = 'running';
      this.emit('pipeline-resumed', pipeline);
      this.executeNextTask(pipelineId);
      return true;
    }
    return false;
  }
}
