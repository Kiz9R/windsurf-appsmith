// Task Management Utilities
export default {
    // State management
    selectedTask: null,
    showCompleted: true,
    listState: 'today',
    tasks: [],
    
    // Task Status Constants
    TASK_STATUS: {
        PENDING: 'pending',
        COMPLETED: 'completed',
        ARCHIVED: 'archived'
    },
    
    // List View States
    LIST_STATES: {
        TODAY: 'today',
        UPCOMING: 'upcoming',
        COMPLETED: 'completed',
        ALL: 'all'
    },

    // CRUD Operations
    
    // Create a new task
    createTask: async (taskData) => {
        try {
            const response = await createTask.run({
                title: taskData.title,
                description: taskData.description || '',
                dueDate: taskData.dueDate || null,
                priority: taskData.priority || 'medium',
                status: this.TASK_STATUS.PENDING,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            
            if (response && response.id) {
                await this.getAllTasks();
                return { success: true, data: response };
            }
            return { success: false, error: 'Failed to create task' };
        } catch (error) {
            console.error('Error creating task:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Read all tasks
    getAllTasks: async (forceRefresh = false) => {
        try {
            if (this.tasks.length === 0 || forceRefresh) {
                const response = await getAllTasks.run();
                this.tasks = Array.isArray(response) ? response : [];
            }
            
            // Filter tasks based on current list state
            let filteredTasks = [...this.tasks];
            const today = new Date().toISOString().split('T')[0];
            
            switch (this.listState) {
                case this.LIST_STATES.TODAY:
                    filteredTasks = filteredTasks.filter(task => 
                        task.dueDate === today && 
                        task.status !== this.TASK_STATUS.ARCHIVED
                    );
                    break;
                    
                case this.LIST_STATES.UPCOMING:
                    filteredTasks = filteredTasks.filter(task => 
                        task.dueDate > today && 
                        task.status !== this.TASK_STATUS.ARCHIVED
                    );
                    break;
                    
                case this.LIST_STATES.COMPLETED:
                    filteredTasks = filteredTasks.filter(task => 
                        task.status === this.TASK_STATUS.COMPLETED
                    );
                    break;
                    
                case this.LIST_STATES.ALL:
                default:
                    filteredTasks = filteredTasks.filter(task => 
                        task.status !== this.TASK_STATUS.ARCHIVED
                    );
            }
            
            // Sort tasks by due date and priority
            filteredTasks.sort((a, b) => {
                // Sort by status (pending first)
                if (a.status !== b.status) {
                    return a.status === this.TASK_STATUS.PENDING ? -1 : 1;
                }
                
                // Then by due date
                if (a.dueDate !== b.dueDate) {
                    return new Date(a.dueDate) - new Date(b.dueDate);
                }
                
                // Then by priority (high to low)
                const priorityOrder = { high: 1, medium: 2, low: 3 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            });
            
            return { success: true, data: filteredTasks };
            
        } catch (error) {
            console.error('Error fetching tasks:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Update a task
    updateTask: async (taskId, updateData) => {
        try {
            const taskIndex = this.tasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1) {
                return { success: false, error: 'Task not found' };
            }
            
            const updatedTask = {
                ...this.tasks[taskIndex],
                ...updateData,
                updatedAt: new Date().toISOString()
            };
            
            const response = await updateTask.run(updatedTask);
            
            if (response && response.id) {
                this.tasks[taskIndex] = response;
                return { success: true, data: response };
            }
            
            return { success: false, error: 'Failed to update task' };
            
        } catch (error) {
            console.error('Error updating task:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Delete a task
    deleteTask: async (taskId) => {
        try {
            // In a real app, you would call an API to delete the task
            // For this example, we'll just update the status to archived
            return await this.updateTask(taskId, { status: this.TASK_STATUS.ARCHIVED });
            
        } catch (error) {
            console.error('Error deleting task:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Toggle task completion status
    toggleTaskCompletion: async (taskId) => {
        try {
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) {
                return { success: false, error: 'Task not found' };
            }
            
            const newStatus = task.status === this.TASK_STATUS.COMPLETED 
                ? this.TASK_STATUS.PENDING 
                : this.TASK_STATUS.COMPLETED;
                
            return await this.updateTask(taskId, { 
                status: newStatus,
                completedAt: newStatus === this.TASK_STATUS.COMPLETED 
                    ? new Date().toISOString() 
                    : null
            });
            
        } catch (error) {
            console.error('Error toggling task completion:', error);
            return { success: false, error: error.message };
        }
    },
    
    // State Management
    setListState: function(listState) {
        if (Object.values(this.LIST_STATES).includes(listState)) {
            this.listState = listState;
            return { success: true };
        }
        return { success: false, error: 'Invalid list state' };
    },
    
    setSelectedTask: function(task) {
        this.selectedTask = task ? { ...task } : null;
        return { success: true };
    },
    
    toggleShowCompleted: function() {
        this.showCompleted = !this.showCompleted;
        return { success: true, showCompleted: this.showCompleted };
    },
    
    // Helper function to get task by ID
    getTaskById: function(taskId) {
        return this.tasks.find(task => task.id === taskId) || null;
    },
    
    // Initialize the tasks
    initialize: async function() {
        return await this.getAllTasks(true);
    }
};