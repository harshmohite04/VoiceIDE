import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { RequirementsService, ProjectSpec } from './requirementsService';
import { TaskQueueService, ExecutionPipeline } from './taskQueueService';
import { VMProvisioningService, VMInstance } from './vmProvisioningService';

export interface ProjectExecution {
  id: string;
  sessionId: string;
  userId: string;
  projectSpec: ProjectSpec;
  vmInstance?: VMInstance;
  pipeline?: ExecutionPipeline;
  status: 'analyzing' | 'provisioning' | 'executing' | 'completed' | 'failed';
  progress: {
    stage: string;
    percentage: number;
    currentTask?: string;
    eta?: number; // minutes
  };
  conversationHistory: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export class ProjectOrchestrationService extends EventEmitter {
  private requirementsService: RequirementsService;
  private taskQueueService: TaskQueueService;
  private vmProvisioningService: VMProvisioningService;
  private executions: Map<string, ProjectExecution> = new Map();

  constructor() {
    super();
    this.requirementsService = new RequirementsService();
    this.taskQueueService = new TaskQueueService();
    this.vmProvisioningService = new VMProvisioningService();

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // VM Provisioning Events
    this.vmProvisioningService.on('vm-provisioned', (vmInstance: VMInstance) => {
      this.handleVMProvisioned(vmInstance);
    });

    this.vmProvisioningService.on('vm-provisioning-failed', (data: { vmInstance: VMInstance; error: any }) => {
      this.handleVMProvisioningFailed(data.vmInstance, data.error);
    });

    // Task Queue Events
    this.taskQueueService.on('pipeline-completed', (pipeline: ExecutionPipeline) => {
      this.handlePipelineCompleted(pipeline);
    });

    this.taskQueueService.on('task-completed', (data: { task: any; pipeline: ExecutionPipeline }) => {
      this.handleTaskProgress(data.pipeline);
    });
  }

  async processVoiceConversation(
    sessionId: string,
    userId: string,
    conversationHistory: string
  ): Promise<ProjectExecution> {
    try {
      logger.info(`Processing voice conversation for session: ${sessionId}`);

      // Create execution record
      const execution: ProjectExecution = {
        id: `exec_${Date.now()}_${sessionId}`,
        sessionId,
        userId,
        projectSpec: {} as ProjectSpec, // Will be populated
        status: 'analyzing',
        progress: {
          stage: 'Analyzing conversation and generating requirements',
          percentage: 10,
        },
        conversationHistory,
        createdAt: new Date(),
      };

      this.executions.set(execution.id, execution);
      this.emit('execution-started', execution);

      // Step 1: Generate requirements from conversation
      const projectSpec = await this.requirementsService.generateRequirementsFromConversation(
        conversationHistory,
        sessionId
      );

      if (!projectSpec) {
        throw new Error('Failed to generate project requirements from conversation');
      }

      execution.projectSpec = projectSpec;
      execution.progress = {
        stage: 'Requirements generated, provisioning VM',
        percentage: 25,
      };
      this.emit('execution-progress', execution);

      // Step 2: Validate requirements
      const validation = await this.requirementsService.validateRequirements(projectSpec);
      if (!validation.isValid) {
        logger.warn(`Requirements validation issues: ${validation.issues.join(', ')}`);
        // Continue anyway, but log issues
      }

      // Step 3: Automatically provision VM (no user interaction)
      execution.status = 'provisioning';
      execution.progress = {
        stage: 'Provisioning virtual machine',
        percentage: 30,
      };
      this.emit('execution-progress', execution);

      const vmInstance = await this.vmProvisioningService.provisionVMForProject(projectSpec);
      execution.vmInstance = vmInstance;

      logger.info(`VM provisioning started for execution: ${execution.id}`);
      
      return execution;

    } catch (error) {
      logger.error('Error processing voice conversation:', error);
      throw error;
    }
  }

  private async handleVMProvisioned(vmInstance: VMInstance): Promise<void> {
    try {
      // Find execution associated with this VM
      const execution = Array.from(this.executions.values()).find(
        exec => exec.vmInstance?.id === vmInstance.id
      );

      if (!execution) {
        logger.error(`No execution found for VM: ${vmInstance.id}`);
        return;
      }

      logger.info(`VM provisioned for execution: ${execution.id}`);

      // Step 4: Create execution pipeline
      execution.status = 'executing';
      execution.progress = {
        stage: 'Creating task execution pipeline',
        percentage: 50,
      };
      this.emit('execution-progress', execution);

      const pipeline = await this.taskQueueService.createExecutionPipeline(execution.projectSpec);
      execution.pipeline = pipeline;

      // Step 5: Start pipeline execution on the VM
      execution.progress = {
        stage: 'Executing project tasks',
        percentage: 60,
        eta: this.calculateETA(pipeline),
      };
      execution.startedAt = new Date();
      this.emit('execution-progress', execution);

      await this.taskQueueService.startPipeline(pipeline.id, vmInstance.id);

      logger.info(`Pipeline execution started for: ${execution.id}`);

    } catch (error) {
      logger.error('Error handling VM provisioned:', error);
    }
  }

  private handleVMProvisioningFailed(vmInstance: VMInstance, error: any): void {
    const execution = Array.from(this.executions.values()).find(
      exec => exec.vmInstance?.id === vmInstance.id
    );

    if (execution) {
      execution.status = 'failed';
      execution.progress = {
        stage: 'VM provisioning failed',
        percentage: 0,
      };
      this.emit('execution-failed', { execution, error });
    }
  }

  private handlePipelineCompleted(pipeline: ExecutionPipeline): void {
    const execution = Array.from(this.executions.values()).find(
      exec => exec.pipeline?.id === pipeline.id
    );

    if (execution) {
      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.progress = {
        stage: 'Project execution completed',
        percentage: 100,
      };

      logger.info(`Project execution completed: ${execution.id}`);
      this.emit('execution-completed', execution);

      // Optionally terminate VM after completion
      setTimeout(() => {
        if (execution.vmInstance) {
          this.vmProvisioningService.terminateVM(execution.vmInstance.id);
        }
      }, 300000); // 5 minutes delay
    }
  }

  private handleTaskProgress(pipeline: ExecutionPipeline): void {
    const execution = Array.from(this.executions.values()).find(
      exec => exec.pipeline?.id === pipeline.id
    );

    if (execution) {
      const progressPercentage = 60 + (pipeline.progress.completedTasks / pipeline.progress.totalTasks) * 35;
      execution.progress = {
        stage: `Executing: ${pipeline.progress.currentTask || 'Unknown task'}`,
        percentage: Math.round(progressPercentage),
        currentTask: pipeline.progress.currentTask,
        eta: this.calculateRemainingETA(pipeline),
      };

      this.emit('execution-progress', execution);
    }
  }

  private calculateETA(pipeline: ExecutionPipeline): number {
    // Calculate estimated time based on task estimates
    const totalMinutes = pipeline.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);
    return Math.round(totalMinutes);
  }

  private calculateRemainingETA(pipeline: ExecutionPipeline): number {
    const remainingTasks = pipeline.tasks.filter(task => 
      task.status === 'pending' || task.status === 'running'
    );
    const remainingMinutes = remainingTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);
    return Math.round(remainingMinutes);
  }

  async getExecutionStatus(executionId: string): Promise<ProjectExecution | null> {
    const execution = this.executions.get(executionId);
    if (!execution) return null;

    // Update with latest VM and pipeline status
    if (execution.vmInstance) {
      const vmStatus = await this.vmProvisioningService.getVMStatus(execution.vmInstance.id);
      if (vmStatus) {
        execution.vmInstance = vmStatus;
      }
    }

    if (execution.pipeline) {
      const pipelineStatus = this.taskQueueService.getPipeline(execution.pipeline.id);
      if (pipelineStatus) {
        execution.pipeline = pipelineStatus;
      }
    }

    return execution;
  }

  getExecutionsByUser(userId: string): ProjectExecution[] {
    return Array.from(this.executions.values()).filter(exec => exec.userId === userId);
  }

  getExecutionBySession(sessionId: string): ProjectExecution | undefined {
    return Array.from(this.executions.values()).find(exec => exec.sessionId === sessionId);
  }

  async pauseExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || !execution.pipeline) return false;

    return this.taskQueueService.pausePipeline(execution.pipeline.id);
  }

  async resumeExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || !execution.pipeline) return false;

    return this.taskQueueService.resumePipeline(execution.pipeline.id);
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    try {
      const execution = this.executions.get(executionId);
      if (!execution) return false;

      // Pause pipeline if running
      if (execution.pipeline) {
        this.taskQueueService.pausePipeline(execution.pipeline.id);
      }

      // Terminate VM if exists
      if (execution.vmInstance) {
        await this.vmProvisioningService.terminateVM(execution.vmInstance.id);
      }

      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.progress = {
        stage: 'Execution cancelled',
        percentage: 0,
      };

      this.emit('execution-cancelled', execution);
      return true;

    } catch (error) {
      logger.error('Error cancelling execution:', error);
      return false;
    }
  }

  // Method to get conversation summary for voice responses
  getExecutionSummary(executionId: string): string {
    const execution = this.executions.get(executionId);
    if (!execution) return 'Execution not found';

    const { projectSpec, progress, status } = execution;
    
    let summary = `Project: ${projectSpec.name}\n`;
    summary += `Status: ${status}\n`;
    summary += `Progress: ${progress.percentage}% - ${progress.stage}\n`;
    
    if (execution.vmInstance) {
      summary += `VM: ${execution.vmInstance.connection.publicIp} (${execution.vmInstance.status})\n`;
    }
    
    if (execution.pipeline) {
      const { completedTasks, totalTasks, failedTasks } = execution.pipeline.progress;
      summary += `Tasks: ${completedTasks}/${totalTasks} completed`;
      if (failedTasks > 0) {
        summary += `, ${failedTasks} failed`;
      }
    }
    
    if (progress.eta) {
      summary += `\nETA: ${progress.eta} minutes`;
    }

    return summary;
  }
}
