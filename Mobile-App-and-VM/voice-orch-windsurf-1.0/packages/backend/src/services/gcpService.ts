const { Compute } = require('@google-cloud/compute');
import { logger } from '../utils/logger';
import { CodeExecutionRequest, CodeExecutionResult } from './vmService';
import { NodeSSH } from 'node-ssh';

export interface GCPInstance {
  id: string;
  name: string;
  zone: string;
  externalIp: string;
  internalIp: string;
  status: string;
}

export class GCPService {
  private compute: any | null = null;
  private projectId: string;
  private zone: string = 'us-central1-a';

  constructor() {
    this.projectId = process.env.GCP_PROJECT_ID || '';
    this.initializeGCP();
  }

  private async initializeGCP() {
    try {
      if (!this.projectId || this.projectId === 'your_gcp_project_id') {
        logger.warn('GCP not configured, VM creation will use Docker fallback');
        return;
      }

      this.compute = new Compute({
        projectId: this.projectId,
        keyFilename: process.env.GCP_KEY_FILE
      });

      // Test GCP connection
      await this.compute.getProjectId();
      logger.info('GCP Compute Engine service initialized successfully');
      
    } catch (error) {
      logger.warn('GCP Compute Engine not available:', error);
      this.compute = null;
    }
  }

  async createInstance(vmId: string, environment: 'node' | 'python' | 'general'): Promise<GCPInstance> {
    if (!this.compute) {
      throw new Error('GCP Compute Engine not available');
    }

    try {
      const zone = this.compute.zone(this.zone);
      const instanceName = `voicedev-${vmId.toLowerCase()}`;

      // Select startup script based on environment
      let startupScript: string;
      
      switch (environment) {
        case 'node':
          startupScript = `#!/bin/bash
            apt-get update
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            apt-get install -y nodejs
            npm install -g pm2
            mkdir -p /workspace
            cd /workspace
            npm init -y
            npm install express
            echo "Node.js environment ready" > /tmp/startup-complete
          `;
          break;
        case 'python':
          startupScript = `#!/bin/bash
            apt-get update
            apt-get install -y python3 python3-pip
            pip3 install flask requests
            mkdir -p /workspace
            cd /workspace
            echo "Python environment ready" > /tmp/startup-complete
          `;
          break;
        default:
          startupScript = `#!/bin/bash
            apt-get update
            apt-get install -y curl wget git
            mkdir -p /workspace
            cd /workspace
            echo "General environment ready" > /tmp/startup-complete
          `;
      }

      const config = {
        os: 'ubuntu',
        http: true,
        https: true,
        tags: ['voicedev', 'development'],
        machineType: 'e2-micro', // Free tier eligible
        metadata: {
          items: [
            {
              key: 'startup-script',
              value: startupScript
            }
          ]
        },
        disks: [
          {
            boot: true,
            autoDelete: true,
            initializeParams: {
              sourceImage: 'projects/ubuntu-os-cloud/global/images/family/ubuntu-2004-lts',
              diskSizeGb: '10'
            }
          }
        ],
        networkInterfaces: [
          {
            network: 'global/networks/default',
            accessConfigs: [
              {
                type: 'ONE_TO_ONE_NAT',
                name: 'External NAT'
              }
            ]
          }
        ]
      };

      const [vm, operation] = await zone.createVM(instanceName, config);
      
      // Wait for operation to complete
      await operation.promise();
      
      // Wait for VM to be running
      await vm.waitFor('RUNNING');
      
      // Get instance details
      const [metadata] = await vm.getMetadata();
      const externalIp = metadata.networkInterfaces[0].accessConfigs[0].natIP;
      const internalIp = metadata.networkInterfaces[0].networkIP;

      logger.info(`GCP instance created: ${instanceName}`);

      return {
        id: vm.id!,
        name: instanceName,
        zone: this.zone,
        externalIp,
        internalIp,
        status: 'running'
      };

    } catch (error) {
      logger.error('Error creating GCP instance:', error);
      throw error;
    }
  }

  async executeCode(instanceId: string, request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    if (!this.compute) throw new Error('GCP Compute Engine not available');

    const startTime = Date.now();

    try {
      const zone = this.compute.zone(this.zone);
      const vm = zone.vm(instanceId);
      
      // Get instance metadata to get external IP
      const [metadata] = await vm.getMetadata();
      const externalIp = metadata.networkInterfaces[0].accessConfigs[0].natIP;

      // Connect via SSH
      const ssh = new NodeSSH();
      
      await ssh.connect({
        host: externalIp,
        username: 'ubuntu',
        privateKey: process.env.GCP_SSH_PRIVATE_KEY || '',
        port: 22,
        readyTimeout: 30000
      });

      // Create execution script based on language
      let command: string;
      let filename: string;

      switch (request.language) {
        case 'javascript':
          filename = 'script.js';
          command = `cd /workspace && echo '${request.code.replace(/'/g, "'\\''")}' > ${filename} && node ${filename}`;
          break;
        case 'python':
          filename = 'script.py';
          command = `cd /workspace && echo '${request.code.replace(/'/g, "'\\''")}' > ${filename} && python3 ${filename}`;
          break;
        case 'bash':
          filename = 'script.sh';
          command = `cd /workspace && echo '${request.code.replace(/'/g, "'\\''")}' > ${filename} && chmod +x ${filename} && ./${filename}`;
          break;
        default:
          throw new Error(`Unsupported language: ${request.language}`);
      }

      // Write additional files if provided
      if (request.files) {
        for (const [fileName, content] of Object.entries(request.files)) {
          const writeFileCmd = `cd /workspace && echo '${content.replace(/'/g, "'\\''")}' > ${fileName}`;
          await ssh.execCommand(writeFileCmd);
        }
      }

      // Execute code with timeout
      const result = await ssh.execCommand(command);

      ssh.dispose();

      const executionTime = Date.now() - startTime;
      const success = result.code === 0;

      return {
        success,
        output: result.stdout || 'No output',
        error: result.stderr || undefined,
        executionTime
      };

    } catch (error) {
      logger.error(`Error executing code in GCP instance ${instanceId}:`, error);
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  }

  async stopInstance(instanceId: string): Promise<void> {
    if (!this.compute) throw new Error('GCP Compute Engine not available');

    try {
      const zone = this.compute.zone(this.zone);
      const vm = zone.vm(instanceId);
      
      const [operation] = await vm.stop();
      await operation.promise();
      
      logger.info(`GCP instance stopped: ${instanceId}`);
    } catch (error) {
      logger.error(`Error stopping GCP instance ${instanceId}:`, error);
      throw error;
    }
  }

  async deleteInstance(instanceId: string): Promise<void> {
    if (!this.compute) throw new Error('GCP Compute Engine not available');

    try {
      const zone = this.compute.zone(this.zone);
      const vm = zone.vm(instanceId);
      
      const [operation] = await vm.delete();
      await operation.promise();
      
      logger.info(`GCP instance deleted: ${instanceId}`);
    } catch (error) {
      logger.error(`Error deleting GCP instance ${instanceId}:`, error);
      throw error;
    }
  }

  async getInstanceStats(instanceId: string): Promise<any> {
    if (!this.compute) throw new Error('GCP Compute Engine not available');

    try {
      const zone = this.compute.zone(this.zone);
      const vm = zone.vm(instanceId);
      
      const [metadata] = await vm.getMetadata();
      
      return {
        status: metadata.status,
        machineType: metadata.machineType.split('/').pop(),
        zone: metadata.zone.split('/').pop(),
        creationTimestamp: metadata.creationTimestamp,
        cpuPlatform: metadata.cpuPlatform,
        networkInterfaces: metadata.networkInterfaces.map((ni: any) => ({
          network: ni.network.split('/').pop(),
          internalIP: ni.networkIP,
          externalIP: ni.accessConfigs?.[0]?.natIP
        }))
      };
    } catch (error) {
      logger.error(`Error getting GCP instance stats ${instanceId}:`, error);
      throw error;
    }
  }

  async listInstances(): Promise<GCPInstance[]> {
    if (!this.compute) throw new Error('GCP Compute Engine not available');

    try {
      const zone = this.compute.zone(this.zone);
      const [vms] = await zone.getVMs({
        filter: 'labels.project=voicedev'
      });

      return vms.map((vm: any) => {
        const metadata = vm.metadata;
        return {
          id: vm.id!,
          name: vm.name!,
          zone: this.zone,
          externalIp: metadata?.networkInterfaces?.[0]?.accessConfigs?.[0]?.natIP || '',
          internalIp: metadata?.networkInterfaces?.[0]?.networkIP || '',
          status: metadata?.status || 'unknown'
        };
      });
    } catch (error) {
      logger.error('Error listing GCP instances:', error);
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.compute !== null;
  }

  async getProjectQuota(): Promise<any> {
    if (!this.compute) throw new Error('GCP Compute Engine not available');

    try {
      const [quotas] = await this.compute.getQuotas();
      return quotas.filter((quota: any) => 
        quota.metric === 'INSTANCES' || 
        quota.metric === 'CPUS' || 
        quota.metric === 'DISKS_TOTAL_GB'
      );
    } catch (error) {
      logger.error('Error getting GCP quotas:', error);
      throw error;
    }
  }
}
