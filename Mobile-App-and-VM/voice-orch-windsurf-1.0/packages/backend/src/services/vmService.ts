import { logger } from '../utils/logger';
import { DockerService } from './dockerService';
import { GCPService } from './gcpService';

export interface VMInstance {
  id: string;
  userId: string;
  sessionId: string;
  status: 'creating' | 'running' | 'stopped' | 'error';
  type: 'docker' | 'gcp';
  environment: 'node' | 'python' | 'general';
  createdAt: Date;
  lastActivity: Date;
  resources: {
    cpu: string;
    memory: string;
    storage: string;
  };
  connection: {
    host?: string;
    port?: number;
    containerId?: string;
    instanceId?: string;
  };
}

export interface CodeExecutionRequest {
  code: string;
  language: 'javascript' | 'python' | 'bash';
  files?: { [filename: string]: string };
  timeout?: number;
}

export interface CodeExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  files?: { [filename: string]: string };
}

export class VMService {
  private dockerService: DockerService;
  private gcpService: GCPService;
  private activeVMs: Map<string, VMInstance> = new Map();

  constructor() {
    this.dockerService = new DockerService();
    this.gcpService = new GCPService();
    logger.info('VM Service initialized');
  }

  async createVM(userId: string, sessionId: string, environment: 'node' | 'python' | 'general' = 'node'): Promise<VMInstance> {
    try {
      const vmId = `vm_${Date.now()}_${userId.substring(0, 8)}`;
      
      logger.info(`Creating VM: ${vmId} for user: ${userId}`);

      // Try Docker first, fallback to GCP if needed
      let vmInstance: VMInstance;
      
      try {
        // Create Docker container
        const dockerContainer = await this.dockerService.createContainer(vmId, environment);
        
        vmInstance = {
          id: vmId,
          userId,
          sessionId,
          status: 'creating',
          type: 'docker',
          environment,
          createdAt: new Date(),
          lastActivity: new Date(),
          resources: {
            cpu: '1 core',
            memory: '512MB',
            storage: '1GB'
          },
          connection: {
            containerId: dockerContainer.id,
            host: 'localhost',
            port: dockerContainer.port
          }
        };

        await this.dockerService.startContainer(dockerContainer.id);
        vmInstance.status = 'running';
        
      } catch (dockerError) {
        logger.warn('Docker creation failed, trying GCP:', dockerError);
        
        // Fallback to GCP Compute Engine
        const gcpInstance = await this.gcpService.createInstance(vmId, environment);
        
        vmInstance = {
          id: vmId,
          userId,
          sessionId,
          status: 'creating',
          type: 'gcp',
          environment,
          createdAt: new Date(),
          lastActivity: new Date(),
          resources: {
            cpu: '1 vCPU',
            memory: '1GB',
            storage: '10GB'
          },
          connection: {
            instanceId: gcpInstance.id,
            host: gcpInstance.externalIp,
            port: 22
          }
        };

        vmInstance.status = 'running';
      }

      this.activeVMs.set(vmId, vmInstance);
      logger.info(`VM created successfully: ${vmId}`);
      
      return vmInstance;
    } catch (error) {
      logger.error('Error creating VM:', error);
      throw error;
    }
  }

  async executeCode(vmId: string, request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    try {
      const vm = this.activeVMs.get(vmId);
      if (!vm) {
        throw new Error(`VM not found: ${vmId}`);
      }

      if (vm.status !== 'running') {
        throw new Error(`VM not running: ${vmId}`);
      }

      vm.lastActivity = new Date();
      
      logger.info(`Executing code in VM: ${vmId}, language: ${request.language}`);

      let result: CodeExecutionResult;

      if (vm.type === 'docker') {
        result = await this.dockerService.executeCode(vm.connection.containerId!, request);
      } else {
        result = await this.gcpService.executeCode(vm.connection.instanceId!, request);
      }

      logger.info(`Code execution completed in VM: ${vmId}, success: ${result.success}`);
      return result;
      
    } catch (error) {
      logger.error(`Error executing code in VM ${vmId}:`, error);
      throw error;
    }
  }

  async getVM(vmId: string): Promise<VMInstance | null> {
    return this.activeVMs.get(vmId) || null;
  }

  async listUserVMs(userId: string): Promise<VMInstance[]> {
    return Array.from(this.activeVMs.values()).filter(vm => vm.userId === userId);
  }

  async stopVM(vmId: string): Promise<void> {
    try {
      const vm = this.activeVMs.get(vmId);
      if (!vm) {
        throw new Error(`VM not found: ${vmId}`);
      }

      logger.info(`Stopping VM: ${vmId}`);

      if (vm.type === 'docker') {
        await this.dockerService.stopContainer(vm.connection.containerId!);
      } else {
        await this.gcpService.stopInstance(vm.connection.instanceId!);
      }

      vm.status = 'stopped';
      logger.info(`VM stopped: ${vmId}`);
      
    } catch (error) {
      logger.error(`Error stopping VM ${vmId}:`, error);
      throw error;
    }
  }

  async deleteVM(vmId: string): Promise<void> {
    try {
      const vm = this.activeVMs.get(vmId);
      if (!vm) {
        throw new Error(`VM not found: ${vmId}`);
      }

      logger.info(`Deleting VM: ${vmId}`);

      if (vm.type === 'docker') {
        await this.dockerService.removeContainer(vm.connection.containerId!);
      } else {
        await this.gcpService.deleteInstance(vm.connection.instanceId!);
      }

      this.activeVMs.delete(vmId);
      logger.info(`VM deleted: ${vmId}`);
      
    } catch (error) {
      logger.error(`Error deleting VM ${vmId}:`, error);
      throw error;
    }
  }

  async getVMStats(vmId: string): Promise<any> {
    try {
      const vm = this.activeVMs.get(vmId);
      if (!vm) {
        throw new Error(`VM not found: ${vmId}`);
      }

      if (vm.type === 'docker') {
        return await this.dockerService.getContainerStats(vm.connection.containerId!);
      } else {
        return await this.gcpService.getInstanceStats(vm.connection.instanceId!);
      }
      
    } catch (error) {
      logger.error(`Error getting VM stats ${vmId}:`, error);
      throw error;
    }
  }

  // Cleanup inactive VMs
  async cleanupInactiveVMs(): Promise<void> {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [vmId, vm] of this.activeVMs.entries()) {
      const inactiveTime = now.getTime() - vm.lastActivity.getTime();
      
      if (inactiveTime > inactiveThreshold && vm.status === 'running') {
        logger.info(`Cleaning up inactive VM: ${vmId}`);
        try {
          await this.stopVM(vmId);
        } catch (error) {
          logger.error(`Error cleaning up VM ${vmId}:`, error);
        }
      }
    }
  }
}

export const vmService = new VMService();
