import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { ProjectSpec } from './requirementsService';

export interface VMConfiguration {
  id: string;
  name: string;
  provider: 'aws' | 'gcp' | 'azure' | 'digitalocean' | 'local';
  region: string;
  instanceType: string;
  os: 'ubuntu-20.04' | 'ubuntu-22.04' | 'debian-11' | 'centos-8';
  storage: number; // GB
  memory: number; // GB
  vcpus: number;
  networking: {
    publicIp: boolean;
    ports: number[];
  };
  software: {
    docker: boolean;
    nodejs: boolean;
    python: boolean;
    windsurf: boolean;
    git: boolean;
  };
}

export interface VMInstance {
  id: string;
  name: string;
  status: 'provisioning' | 'running' | 'stopped' | 'terminated' | 'error';
  configuration: VMConfiguration;
  connection: {
    publicIp?: string;
    privateIp?: string;
    sshKey?: string;
    windsurfPort?: number;
  };
  projectId?: string;
  createdAt: Date;
  startedAt?: Date;
  terminatedAt?: Date;
  cost?: {
    hourlyRate: number;
    totalCost: number;
  };
}

export class VMProvisioningService extends EventEmitter {
  private instances: Map<string, VMInstance> = new Map();
  private provisioningQueue: string[] = [];

  constructor() {
    super();
  }

  async provisionVMForProject(projectSpec: ProjectSpec): Promise<VMInstance> {
    try {
      logger.info(`Auto-provisioning VM for project: ${projectSpec.name}`);

      // Generate VM configuration based on project requirements
      const vmConfig = this.generateVMConfiguration(projectSpec);
      
      // Create VM instance record
      const vmInstance: VMInstance = {
        id: `vm_${Date.now()}_${projectSpec.id}`,
        name: `${projectSpec.name.toLowerCase().replace(/\s+/g, '-')}-vm`,
        status: 'provisioning',
        configuration: vmConfig,
        connection: {},
        projectId: projectSpec.id,
        createdAt: new Date(),
      };

      this.instances.set(vmInstance.id, vmInstance);
      this.provisioningQueue.push(vmInstance.id);

      logger.info(`Created VM instance record: ${vmInstance.id}`);
      this.emit('vm-provisioning-started', vmInstance);

      // Start provisioning process
      this.startProvisioning(vmInstance.id);

      return vmInstance;

    } catch (error) {
      logger.error('Error provisioning VM:', error);
      throw error;
    }
  }

  private generateVMConfiguration(projectSpec: ProjectSpec): VMConfiguration {
    // Analyze project requirements to determine VM specs
    const techStack = projectSpec.techStack;
    const estimatedDuration = projectSpec.estimatedDuration;
    const requirementCount = projectSpec.requirements.length;

    // Base configuration
    let memory = 2; // GB
    let vcpus = 1;
    let storage = 20; // GB

    // Scale based on project complexity
    if (requirementCount > 10 || estimatedDuration > 48) {
      memory = 4;
      vcpus = 2;
      storage = 40;
    }

    if (requirementCount > 20 || estimatedDuration > 100) {
      memory = 8;
      vcpus = 4;
      storage = 80;
    }

    // Adjust for specific technologies
    if (techStack.includes('Docker') || techStack.includes('Kubernetes')) {
      memory = Math.max(memory, 4);
      storage = Math.max(storage, 40);
    }

    if (techStack.includes('PostgreSQL') || techStack.includes('MongoDB')) {
      memory = Math.max(memory, 3);
      storage = Math.max(storage, 30);
    }

    const ports = [22, 3000, 8080]; // SSH, common dev ports
    if (techStack.includes('React') || techStack.includes('Next.js')) {
      ports.push(3000, 3001);
    }
    if (techStack.includes('Express') || techStack.includes('Node.js')) {
      ports.push(5000, 8000);
    }

    return {
      id: `config_${Date.now()}`,
      name: `${projectSpec.name}-config`,
      provider: 'digitalocean', // Default provider
      region: 'nyc1',
      instanceType: this.getInstanceType(memory, vcpus),
      os: 'ubuntu-22.04',
      storage,
      memory,
      vcpus,
      networking: {
        publicIp: true,
        ports: [...new Set(ports)], // Remove duplicates
      },
      software: {
        docker: techStack.includes('Docker'),
        nodejs: techStack.includes('Node.js') || techStack.includes('React') || techStack.includes('Next.js'),
        python: techStack.includes('Python') || techStack.includes('Django') || techStack.includes('FastAPI'),
        windsurf: true, // Always install Windsurf
        git: true, // Always install Git
      },
    };
  }

  private getInstanceType(memory: number, vcpus: number): string {
    // Map memory/CPU to instance types (DigitalOcean example)
    if (memory <= 2 && vcpus <= 1) return 's-1vcpu-2gb';
    if (memory <= 4 && vcpus <= 2) return 's-2vcpu-4gb';
    if (memory <= 8 && vcpus <= 4) return 's-4vcpu-8gb';
    return 's-8vcpu-16gb';
  }

  private async startProvisioning(vmId: string): Promise<void> {
    const vmInstance = this.instances.get(vmId);
    if (!vmInstance) return;

    try {
      logger.info(`Starting provisioning for VM: ${vmId}`);

      // Step 1: Create cloud instance
      await this.createCloudInstance(vmInstance);

      // Step 2: Wait for instance to be ready
      await this.waitForInstanceReady(vmInstance);

      // Step 3: Install software
      await this.installSoftware(vmInstance);

      // Step 4: Configure Windsurf
      await this.configureWindsurf(vmInstance);

      // Step 5: Verify installation
      await this.verifyInstallation(vmInstance);

      vmInstance.status = 'running';
      vmInstance.startedAt = new Date();

      logger.info(`VM provisioning completed: ${vmId}`);
      this.emit('vm-provisioned', vmInstance);

    } catch (error) {
      logger.error(`VM provisioning failed for ${vmId}:`, error);
      vmInstance.status = 'error';
      this.emit('vm-provisioning-failed', { vmInstance, error });
    }
  }

  private async createCloudInstance(vmInstance: VMInstance): Promise<void> {
    // Simulate cloud instance creation
    logger.info(`Creating cloud instance for VM: ${vmInstance.id}`);
    
    // In real implementation, this would call cloud provider APIs
    // For now, simulating the process
    await this.simulateDelay(5000, 15000); // 5-15 seconds

    // Simulate getting connection details
    vmInstance.connection = {
      publicIp: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      privateIp: `10.0.0.${Math.floor(Math.random() * 255)}`,
      sshKey: 'ssh-rsa AAAAB3NzaC1yc2E...', // Simulated
      windsurfPort: 3001,
    };

    logger.info(`Cloud instance created with IP: ${vmInstance.connection.publicIp}`);
  }

  private async waitForInstanceReady(vmInstance: VMInstance): Promise<void> {
    logger.info(`Waiting for instance to be ready: ${vmInstance.id}`);
    
    // Simulate waiting for SSH to be available
    await this.simulateDelay(30000, 60000); // 30-60 seconds
    
    logger.info(`Instance ready: ${vmInstance.id}`);
  }

  private async installSoftware(vmInstance: VMInstance): Promise<void> {
    logger.info(`Installing software on VM: ${vmInstance.id}`);
    
    const config = vmInstance.configuration;
    const installCommands: string[] = [
      'sudo apt update && sudo apt upgrade -y',
    ];

    if (config.software.git) {
      installCommands.push('sudo apt install -y git curl wget');
    }

    if (config.software.nodejs) {
      installCommands.push(
        'curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -',
        'sudo apt install -y nodejs',
        'sudo npm install -g npm@latest yarn'
      );
    }

    if (config.software.python) {
      installCommands.push('sudo apt install -y python3 python3-pip python3-venv');
    }

    if (config.software.docker) {
      installCommands.push(
        'sudo apt install -y apt-transport-https ca-certificates gnupg lsb-release',
        'curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg',
        'sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io',
        'sudo usermod -aG docker $USER'
      );
    }

    // Simulate installation time
    await this.simulateDelay(60000, 120000); // 1-2 minutes

    logger.info(`Software installation completed: ${vmInstance.id}`);
  }

  private async configureWindsurf(vmInstance: VMInstance): Promise<void> {
    logger.info(`Configuring Windsurf on VM: ${vmInstance.id}`);
    
    // Simulate Windsurf installation and configuration
    const windsurfCommands = [
      'wget -O windsurf.deb https://windsurf.codeium.com/download/linux/deb',
      'sudo dpkg -i windsurf.deb',
      'sudo apt-get install -f', // Fix dependencies if needed
      'mkdir -p /home/ubuntu/workspace',
      'chown ubuntu:ubuntu /home/ubuntu/workspace',
    ];

    // Simulate Windsurf setup time
    await this.simulateDelay(30000, 60000); // 30-60 seconds

    logger.info(`Windsurf configured: ${vmInstance.id}`);
  }

  private async verifyInstallation(vmInstance: VMInstance): Promise<void> {
    logger.info(`Verifying installation on VM: ${vmInstance.id}`);
    
    // Simulate verification checks
    const verificationCommands = [
      'node --version',
      'npm --version',
      'git --version',
      'windsurf --version',
    ];

    // Simulate verification time
    await this.simulateDelay(10000, 20000); // 10-20 seconds

    logger.info(`Installation verified: ${vmInstance.id}`);
  }

  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async terminateVM(vmId: string): Promise<boolean> {
    try {
      const vmInstance = this.instances.get(vmId);
      if (!vmInstance) {
        logger.error(`VM not found: ${vmId}`);
        return false;
      }

      logger.info(`Terminating VM: ${vmId}`);
      
      vmInstance.status = 'terminated';
      vmInstance.terminatedAt = new Date();

      // Calculate cost (simulated)
      if (vmInstance.startedAt) {
        const hoursRunning = (vmInstance.terminatedAt.getTime() - vmInstance.startedAt.getTime()) / (1000 * 60 * 60);
        vmInstance.cost = {
          hourlyRate: this.getHourlyRate(vmInstance.configuration),
          totalCost: hoursRunning * this.getHourlyRate(vmInstance.configuration),
        };
      }

      this.emit('vm-terminated', vmInstance);
      
      // Remove from instances after a delay (for logging purposes)
      setTimeout(() => {
        this.instances.delete(vmId);
      }, 300000); // 5 minutes

      return true;
    } catch (error) {
      logger.error('Error terminating VM:', error);
      return false;
    }
  }

  private getHourlyRate(config: VMConfiguration): number {
    // Simulated hourly rates based on instance type
    const rates: { [key: string]: number } = {
      's-1vcpu-2gb': 0.012,
      's-2vcpu-4gb': 0.024,
      's-4vcpu-8gb': 0.048,
      's-8vcpu-16gb': 0.096,
    };
    return rates[config.instanceType] || 0.024;
  }

  getVM(vmId: string): VMInstance | undefined {
    return this.instances.get(vmId);
  }

  getAllVMs(): VMInstance[] {
    return Array.from(this.instances.values());
  }

  getVMsByProject(projectId: string): VMInstance[] {
    return Array.from(this.instances.values()).filter(vm => vm.projectId === projectId);
  }

  async getVMStatus(vmId: string): Promise<VMInstance | null> {
    const vm = this.instances.get(vmId);
    if (!vm) return null;

    // In real implementation, this would check actual VM status via cloud provider API
    return vm;
  }
}
