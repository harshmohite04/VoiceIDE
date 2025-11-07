export enum TaskStatus {
    Pending = 'pending',
    InProgress = 'inProgress',
    Completed = 'completed',
    Failed = 'failed',
    Cancelled = 'cancelled'
}

export interface Task {
    id: string;
    description: string;
    status: TaskStatus;
    createdAt: Date;
    updatedAt: Date;
    error?: string;
    metadata: Record<string, any>;
}
