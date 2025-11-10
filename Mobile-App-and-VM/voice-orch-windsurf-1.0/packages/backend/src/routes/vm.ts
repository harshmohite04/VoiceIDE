import { Router } from 'express';
import { vmService } from '../services/vmService';
import { verifyToken } from './auth';
import { logger } from '../utils/logger';

const router = Router();

// Create new VM
router.post('/create', verifyToken, async (req: any, res: any) => {
  try {
    const { sessionId, environment = 'node' } = req.body;
    const userId = req.user.uid;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    logger.info(`Creating VM for user: ${userId}, session: ${sessionId}`);

    const vm = await vmService.createVM(userId, sessionId, environment);
    
    res.json({
      success: true,
      vm: {
        id: vm.id,
        status: vm.status,
        type: vm.type,
        environment: vm.environment,
        resources: vm.resources,
        createdAt: vm.createdAt
      }
    });
  } catch (error) {
    logger.error('Error creating VM:', error);
    res.status(500).json({ 
      error: 'Failed to create VM',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Execute code in VM
router.post('/:vmId/execute', verifyToken, async (req: any, res: any) => {
  try {
    const { vmId } = req.params;
    const { code, language, files, timeout } = req.body;
    const userId = req.user.uid;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }

    // Verify VM ownership
    const vm = await vmService.getVM(vmId);
    if (!vm) {
      return res.status(404).json({ error: 'VM not found' });
    }

    if (vm.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    logger.info(`Executing code in VM: ${vmId}, language: ${language}`);

    const result = await vmService.executeCode(vmId, {
      code,
      language,
      files,
      timeout
    });

    res.json({
      success: true,
      result
    });
  } catch (error) {
    logger.error(`Error executing code in VM ${req.params.vmId}:`, error);
    res.status(500).json({ 
      error: 'Failed to execute code',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get VM details
router.get('/:vmId', verifyToken, async (req: any, res: any) => {
  try {
    const { vmId } = req.params;
    const userId = req.user.uid;

    const vm = await vmService.getVM(vmId);
    if (!vm) {
      return res.status(404).json({ error: 'VM not found' });
    }

    if (vm.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      vm: {
        id: vm.id,
        status: vm.status,
        type: vm.type,
        environment: vm.environment,
        resources: vm.resources,
        createdAt: vm.createdAt,
        lastActivity: vm.lastActivity
      }
    });
  } catch (error) {
    logger.error(`Error getting VM ${req.params.vmId}:`, error);
    res.status(500).json({ 
      error: 'Failed to get VM details',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List user's VMs
router.get('/', verifyToken, async (req: any, res: any) => {
  try {
    const userId = req.user.uid;

    const vms = await vmService.listUserVMs(userId);
    
    res.json({
      success: true,
      vms: vms.map(vm => ({
        id: vm.id,
        status: vm.status,
        type: vm.type,
        environment: vm.environment,
        resources: vm.resources,
        createdAt: vm.createdAt,
        lastActivity: vm.lastActivity
      }))
    });
  } catch (error) {
    logger.error('Error listing VMs:', error);
    res.status(500).json({ 
      error: 'Failed to list VMs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get VM statistics
router.get('/:vmId/stats', verifyToken, async (req: any, res: any) => {
  try {
    const { vmId } = req.params;
    const userId = req.user.uid;

    const vm = await vmService.getVM(vmId);
    if (!vm) {
      return res.status(404).json({ error: 'VM not found' });
    }

    if (vm.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stats = await vmService.getVMStats(vmId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error(`Error getting VM stats ${req.params.vmId}:`, error);
    res.status(500).json({ 
      error: 'Failed to get VM statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Stop VM
router.post('/:vmId/stop', verifyToken, async (req: any, res: any) => {
  try {
    const { vmId } = req.params;
    const userId = req.user.uid;

    const vm = await vmService.getVM(vmId);
    if (!vm) {
      return res.status(404).json({ error: 'VM not found' });
    }

    if (vm.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    logger.info(`Stopping VM: ${vmId}`);

    await vmService.stopVM(vmId);
    
    res.json({
      success: true,
      message: 'VM stopped successfully'
    });
  } catch (error) {
    logger.error(`Error stopping VM ${req.params.vmId}:`, error);
    res.status(500).json({ 
      error: 'Failed to stop VM',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete VM
router.delete('/:vmId', verifyToken, async (req: any, res: any) => {
  try {
    const { vmId } = req.params;
    const userId = req.user.uid;

    const vm = await vmService.getVM(vmId);
    if (!vm) {
      return res.status(404).json({ error: 'VM not found' });
    }

    if (vm.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    logger.info(`Deleting VM: ${vmId}`);

    await vmService.deleteVM(vmId);
    
    res.json({
      success: true,
      message: 'VM deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting VM ${req.params.vmId}:`, error);
    res.status(500).json({ 
      error: 'Failed to delete VM',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check for VM service
router.get('/health/check', async (req: any, res: any) => {
  try {
    const dockerAvailable = require('../services/dockerService').DockerService ? true : false;
    const gcpAvailable = require('../services/gcpService').GCPService ? true : false;

    res.json({
      success: true,
      services: {
        docker: dockerAvailable,
        gcp: gcpAvailable
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error checking VM service health:', error);
    res.status(500).json({ 
      error: 'Failed to check service health',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as vmRoutes };
