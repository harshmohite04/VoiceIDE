import Docker from 'dockerode';
import { logger } from '../utils/logger';
import { CodeExecutionRequest, CodeExecutionResult } from './vmService';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface DockerContainer {
  id: string;
  name: string;
  port: number;
  status: string;
}

export class DockerService {
  private docker: Docker | null = null;
  private portCounter = 8000;

  constructor() {
    this.initializeDocker();
  }

  private async initializeDocker() {
    try {
      // Try to connect to Docker
      this.docker = new Docker();
      
      // Test Docker connection
      await this.docker.ping();
      logger.info('Docker service initialized successfully');
      
      // Ensure base images are available
      await this.ensureBaseImages();
      
    } catch (error) {
      logger.warn('Docker not available:', error);
      this.docker = null;
    }
  }

  private async ensureBaseImages() {
    if (!this.docker) return;

    const images = [
      { name: 'node:18-alpine', tag: 'voicedev-node' },
      { name: 'python:3.11-alpine', tag: 'voicedev-python' },
      { name: 'alpine:latest', tag: 'voicedev-general' }
    ];

    for (const image of images) {
      try {
        await this.docker.getImage(image.name).inspect();
        logger.info(`Base image available: ${image.name}`);
      } catch (error) {
        logger.info(`Pulling base image: ${image.name}`);
        try {
          await this.pullImage(image.name);
        } catch (pullError) {
          logger.error(`Failed to pull image ${image.name}:`, pullError);
        }
      }
    }
  }

  private async pullImage(imageName: string): Promise<void> {
    if (!this.docker) throw new Error('Docker not available');

    return new Promise((resolve, reject) => {
      this.docker!.pull(imageName, (err: any, stream: any) => {
        if (err) return reject(err);

        this.docker!.modem.followProgress(stream, (err: any, res: any) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  }

  async createContainer(vmId: string, environment: 'node' | 'python' | 'general'): Promise<DockerContainer> {
    if (!this.docker) {
      throw new Error('Docker not available');
    }

    try {
      const port = this.portCounter++;
      const containerName = `voicedev-${vmId}`;

      // Select base image based on environment
      let imageName: string;
      let cmd: string[];

      switch (environment) {
        case 'node':
          imageName = 'node:18-alpine';
          cmd = ['sh', '-c', 'npm init -y && npm install express && tail -f /dev/null'];
          break;
        case 'python':
          imageName = 'python:3.11-alpine';
          cmd = ['sh', '-c', 'pip install requests flask && tail -f /dev/null'];
          break;
        default:
          imageName = 'alpine:latest';
          cmd = ['sh', '-c', 'apk add --no-cache curl wget && tail -f /dev/null'];
      }

      // Create container configuration
      const containerConfig = {
        Image: imageName,
        name: containerName,
        Cmd: cmd,
        WorkingDir: '/workspace',
        ExposedPorts: {
          [`${port}/tcp`]: {}
        },
        HostConfig: {
          PortBindings: {
            [`${port}/tcp`]: [{ HostPort: port.toString() }]
          },
          Memory: 512 * 1024 * 1024, // 512MB
          CpuShares: 512, // Half CPU
          NetworkMode: 'bridge'
        },
        Env: [
          'NODE_ENV=development',
          'PYTHONUNBUFFERED=1'
        ]
      };

      const container = await this.docker.createContainer(containerConfig);
      
      logger.info(`Docker container created: ${containerName}`);

      return {
        id: container.id,
        name: containerName,
        port,
        status: 'created'
      };

    } catch (error) {
      logger.error('Error creating Docker container:', error);
      throw error;
    }
  }

  async startContainer(containerId: string): Promise<void> {
    if (!this.docker) throw new Error('Docker not available');

    try {
      const container = this.docker.getContainer(containerId);
      await container.start();
      
      // Wait a moment for container to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      logger.info(`Docker container started: ${containerId}`);
    } catch (error) {
      logger.error(`Error starting container ${containerId}:`, error);
      throw error;
    }
  }

  async executeCode(containerId: string, request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    if (!this.docker) throw new Error('Docker not available');

    const startTime = Date.now();

    try {
      const container = this.docker.getContainer(containerId);

      // Create execution command based on language
      let execCmd: string[];
      let filename: string;

      switch (request.language) {
        case 'javascript':
          filename = 'script.js';
          execCmd = ['node', `/workspace/${filename}`];
          break;
        case 'python':
          filename = 'script.py';
          execCmd = ['python', `/workspace/${filename}`];
          break;
        case 'bash':
          filename = 'script.sh';
          execCmd = ['sh', `/workspace/${filename}`];
          break;
        default:
          throw new Error(`Unsupported language: ${request.language}`);
      }

      // Write code to container
      await this.writeFileToContainer(containerId, filename, request.code);

      // Write additional files if provided
      if (request.files) {
        for (const [fileName, content] of Object.entries(request.files)) {
          await this.writeFileToContainer(containerId, fileName, content);
        }
      }

      // Execute code
      const exec = await container.exec({
        Cmd: execCmd,
        AttachStdout: true,
        AttachStderr: true,
        WorkingDir: '/workspace'
      });

      const stream = await exec.start({ hijack: true, stdin: false });
      
      // Collect output
      let output = '';
      let error = '';

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({
            success: false,
            output: output || 'Execution timeout',
            error: 'Execution timed out',
            executionTime: Date.now() - startTime
          });
        }, request.timeout || 30000);

        container.modem.demuxStream(stream, 
          // stdout
          (chunk: Buffer) => {
            output += chunk.toString();
          },
          // stderr
          (chunk: Buffer) => {
            error += chunk.toString();
          }
        );

        stream.on('end', async () => {
          clearTimeout(timeout);
          
          const executionTime = Date.now() - startTime;
          const success = !error || error.trim().length === 0;

          // Read any output files
          let outputFiles: { [filename: string]: string } = {};
          try {
            // Try to read common output files
            const commonFiles = ['output.txt', 'result.json', 'data.csv'];
            for (const file of commonFiles) {
              try {
                const content = await this.readFileFromContainer(containerId, file);
                if (content) {
                  outputFiles[file] = content;
                }
              } catch (e) {
                // File doesn't exist, ignore
              }
            }
          } catch (e) {
            // Ignore file reading errors
          }

          resolve({
            success,
            output: output || 'No output',
            error: error || undefined,
            executionTime,
            files: Object.keys(outputFiles).length > 0 ? outputFiles : undefined
          });
        });
      });

    } catch (error) {
      logger.error(`Error executing code in container ${containerId}:`, error);
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  }

  private async writeFileToContainer(containerId: string, filename: string, content: string): Promise<void> {
    if (!this.docker) throw new Error('Docker not available');

    const container = this.docker.getContainer(containerId);
    
    // Create tar stream with file content
    const tarStream = require('tar-stream');
    const pack = tarStream.pack();
    
    pack.entry({ name: filename }, content);
    pack.finalize();

    await container.putArchive(pack, { path: '/workspace' });
  }

  private async readFileFromContainer(containerId: string, filename: string): Promise<string | null> {
    if (!this.docker) throw new Error('Docker not available');

    try {
      const container = this.docker.getContainer(containerId);
      const stream = await container.getArchive({ path: `/workspace/${filename}` });
      
      return new Promise((resolve, reject) => {
        const tarStream = require('tar-stream');
        const extract = tarStream.extract();
        let content = '';

        extract.on('entry', (header: any, stream: any, next: any) => {
          stream.on('data', (chunk: Buffer) => {
            content += chunk.toString();
          });
          stream.on('end', next);
          stream.resume();
        });

        extract.on('finish', () => {
          resolve(content || null);
        });

        extract.on('error', reject);
        stream.pipe(extract);
      });
    } catch (error) {
      return null;
    }
  }

  async stopContainer(containerId: string): Promise<void> {
    if (!this.docker) throw new Error('Docker not available');

    try {
      const container = this.docker.getContainer(containerId);
      await container.stop();
      logger.info(`Docker container stopped: ${containerId}`);
    } catch (error) {
      logger.error(`Error stopping container ${containerId}:`, error);
      throw error;
    }
  }

  async removeContainer(containerId: string): Promise<void> {
    if (!this.docker) throw new Error('Docker not available');

    try {
      const container = this.docker.getContainer(containerId);
      await container.remove({ force: true });
      logger.info(`Docker container removed: ${containerId}`);
    } catch (error) {
      logger.error(`Error removing container ${containerId}:`, error);
      throw error;
    }
  }

  async getContainerStats(containerId: string): Promise<any> {
    if (!this.docker) throw new Error('Docker not available');

    try {
      const container = this.docker.getContainer(containerId);
      const stats = await container.stats({ stream: false });
      
      return {
        cpu: this.calculateCpuPercent(stats),
        memory: {
          usage: stats.memory_stats.usage,
          limit: stats.memory_stats.limit,
          percent: (stats.memory_stats.usage / stats.memory_stats.limit) * 100
        },
        network: stats.networks,
        uptime: Date.now() - new Date(stats.read).getTime()
      };
    } catch (error) {
      logger.error(`Error getting container stats ${containerId}:`, error);
      throw error;
    }
  }

  private calculateCpuPercent(stats: any): number {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const numberCpus = stats.cpu_stats.online_cpus;

    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * numberCpus * 100;
    }
    return 0;
  }

  isAvailable(): boolean {
    return this.docker !== null;
  }
}
