import { OpenAI } from 'openai';
import { logger } from '../utils/logger';

export interface ProjectRequirement {
  id: string;
  title: string;
  description: string;
  type: 'frontend' | 'backend' | 'fullstack' | 'api' | 'database' | 'deployment';
  priority: 'high' | 'medium' | 'low';
  estimatedHours: number;
  dependencies: string[];
  techStack: string[];
  acceptanceCriteria: string[];
  createdAt: Date;
}

export interface ProjectSpec {
  id: string;
  name: string;
  description: string;
  requirements: ProjectRequirement[];
  techStack: string[];
  architecture: string;
  deploymentTarget: 'vm' | 'container' | 'serverless';
  estimatedDuration: number;
  createdAt: Date;
}

export class RequirementsService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }

  async generateRequirementsFromConversation(
    conversationHistory: string,
    sessionId: string
  ): Promise<ProjectSpec | null> {
    try {
      logger.info(`Generating requirements from conversation for session: ${sessionId}`);

      const prompt = `
You are a senior technical product manager analyzing a voice conversation to extract structured project requirements.

CONVERSATION HISTORY:
${conversationHistory}

TASK: Generate a comprehensive project specification with detailed requirements.

OUTPUT FORMAT (JSON):
{
  "name": "Project Name",
  "description": "Brief project description",
  "architecture": "Describe overall architecture (e.g., 'React frontend with Node.js backend and PostgreSQL database')",
  "techStack": ["React", "Node.js", "PostgreSQL", "etc"],
  "deploymentTarget": "vm",
  "estimatedDuration": 24,
  "requirements": [
    {
      "title": "Requirement Title",
      "description": "Detailed description",
      "type": "frontend|backend|fullstack|api|database|deployment",
      "priority": "high|medium|low",
      "estimatedHours": 8,
      "dependencies": ["other-requirement-ids"],
      "techStack": ["specific-technologies"],
      "acceptanceCriteria": [
        "Specific testable criteria",
        "User can perform X action",
        "System responds within Y seconds"
      ]
    }
  ]
}

GUIDELINES:
- Break down into logical, implementable requirements
- Each requirement should be 4-12 hours of work
- Include proper dependencies between requirements
- Focus on MVP features first (high priority)
- Include non-functional requirements (performance, security)
- Make acceptance criteria specific and testable
- Consider the full development lifecycle
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a senior technical product manager who creates detailed, actionable project specifications.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        logger.error('No content received from OpenAI');
        return null;
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error('No JSON found in OpenAI response');
        return null;
      }

      const parsedSpec = JSON.parse(jsonMatch[0]);
      
      // Create full ProjectSpec object
      const projectSpec: ProjectSpec = {
        id: `proj_${Date.now()}_${sessionId}`,
        name: parsedSpec.name,
        description: parsedSpec.description,
        architecture: parsedSpec.architecture,
        techStack: parsedSpec.techStack || [],
        deploymentTarget: parsedSpec.deploymentTarget || 'vm',
        estimatedDuration: parsedSpec.estimatedDuration || 24,
        requirements: parsedSpec.requirements.map((req: any, index: number) => ({
          id: `req_${Date.now()}_${index}`,
          title: req.title,
          description: req.description,
          type: req.type,
          priority: req.priority,
          estimatedHours: req.estimatedHours || 4,
          dependencies: req.dependencies || [],
          techStack: req.techStack || [],
          acceptanceCriteria: req.acceptanceCriteria || [],
          createdAt: new Date(),
        })),
        createdAt: new Date(),
      };

      logger.info(`Generated project spec: ${projectSpec.name} with ${projectSpec.requirements.length} requirements`);
      return projectSpec;

    } catch (error) {
      logger.error('Error generating requirements:', error);
      return null;
    }
  }

  async refineRequirements(
    projectSpec: ProjectSpec,
    feedback: string
  ): Promise<ProjectSpec | null> {
    try {
      logger.info(`Refining requirements for project: ${projectSpec.name}`);

      const prompt = `
CURRENT PROJECT SPEC:
${JSON.stringify(projectSpec, null, 2)}

USER FEEDBACK:
${feedback}

TASK: Refine the project specification based on the feedback. Update requirements, add new ones, or modify existing ones as needed.

Return the updated JSON in the same format.
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a senior technical product manager refining project specifications based on feedback.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return null;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const refinedSpec = JSON.parse(jsonMatch[0]);
      
      // Update the project spec with refined data
      return {
        ...projectSpec,
        ...refinedSpec,
        id: projectSpec.id, // Keep original ID
        createdAt: projectSpec.createdAt, // Keep original creation date
        requirements: refinedSpec.requirements.map((req: any, index: number) => ({
          ...req,
          id: req.id || `req_${Date.now()}_${index}`,
          createdAt: new Date(),
        })),
      };

    } catch (error) {
      logger.error('Error refining requirements:', error);
      return null;
    }
  }

  async validateRequirements(projectSpec: ProjectSpec): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Basic validation
    if (!projectSpec.name || projectSpec.name.trim().length === 0) {
      issues.push('Project name is required');
    }

    if (!projectSpec.requirements || projectSpec.requirements.length === 0) {
      issues.push('At least one requirement is needed');
    }

    if (!projectSpec.techStack || projectSpec.techStack.length === 0) {
      issues.push('Technology stack must be specified');
    }

    // Dependency validation
    const requirementIds = new Set(projectSpec.requirements.map(req => req.id));
    projectSpec.requirements.forEach(req => {
      req.dependencies.forEach(depId => {
        if (!requirementIds.has(depId)) {
          issues.push(`Requirement "${req.title}" has invalid dependency: ${depId}`);
        }
      });
    });

    // Suggestions for improvement
    const highPriorityCount = projectSpec.requirements.filter(req => req.priority === 'high').length;
    if (highPriorityCount === 0) {
      suggestions.push('Consider marking some requirements as high priority for MVP');
    }

    const totalHours = projectSpec.requirements.reduce((sum, req) => sum + req.estimatedHours, 0);
    if (totalHours > 200) {
      suggestions.push('Project seems large - consider breaking into phases');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
    };
  }
}
