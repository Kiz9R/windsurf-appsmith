// Task Management Utilities for Appsmith
export default {
    // State management properties
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
    createTask: function(taskData) {
        return createTask.run({
            title: taskData.title,
            description: taskData.description || '',
            dueDate: taskData.dueDate || null,
            priority: taskData.priority || 'medium',
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }).then(response => {
            if (response && response.id) {
                return this.getAllTasks().then(() => {
                    return { success: true, data: response };
                });
            }
            return { success: false, error: 'Failed to create task' };
        }).catch(error => {
            console.error('Error creating task:', error);
            return { success: false, error: error.message };
        });
    },
    
    // Read all tasks
    getAllTasks: function(forceRefresh) {
        if (this.tasks.length === 0 || forceRefresh) {
            return getAllTasks.run().then(response => {
                this.tasks = Array.isArray(response) ? response : [];
                return this.getFilteredTasks();
            }).catch(error => {
                console.error('Error fetching tasks:', error);
                return { success: false, error: error.message };
            });
        } else {
            return Promise.resolve(this.getFilteredTasks());
        }
    },
    
    // Get filtered tasks based on current list state
    getFilteredTasks: function() {
        let filteredTasks = [...this.tasks];
        const today = new Date().toISOString().split('T')[0];
        
        switch (this.listState) {
            case this.LIST_STATES.TODAY:
                filteredTasks = filteredTasks.filter(task => 
                    task.dueDate === today && 
                    task.status !== 'archived'
                );
                break;
                
            case this.LIST_STATES.UPCOMING:
                filteredTasks = filteredTasks.filter(task => 
                    task.dueDate > today && 
                    task.status !== 'archived'
                );
                break;
                
            case this.LIST_STATES.COMPLETED:
                filteredTasks = filteredTasks.filter(task => 
                    task.status === 'completed'
                );
                break;
                
            case this.LIST_STATES.ALL:
            default:
                filteredTasks = filteredTasks.filter(task => 
                    task.status !== 'archived'
                );
        }
        
        // Sort tasks by due date and priority
        filteredTasks.sort((a, b) => {
            // Sort by status (pending first)
            if (a.status !== b.status) {
                return a.status === 'pending' ? -1 : 1;
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
    },
    
    // Update a task
    updateTask: function(taskId, updateData) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            return Promise.resolve({ success: false, error: 'Task not found' });
        }
        
        const updatedTask = {
            ...this.tasks[taskIndex],
            ...updateData,
            updatedAt: new Date().toISOString()
        };
        
        return updateTask.run(updatedTask).then(response => {
            if (response && response.id) {
                this.tasks[taskIndex] = response;
                return { success: true, data: response };
            }
            return { success: false, error: 'Failed to update task' };
        }).catch(error => {
            console.error('Error updating task:', error);
            return { success: false, error: error.message };
        });
    },
    
    // Delete a task (soft delete by archiving)
    deleteTask: function(taskId) {
        // In a real app, you might want to call a delete API
        // For this example, we'll just update the status to archived
        return this.updateTask(taskId, { status: 'archived' });
    },
    
    // Toggle task completion status
    toggleTaskCompletion: function(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            return Promise.resolve({ success: false, error: 'Task not found' });
        }
        
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        
        return this.updateTask(taskId, { 
            status: newStatus,
            completedAt: newStatus === 'completed' ? new Date().toISOString() : null
        });
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
    initialize: function() {
        return this.getAllTasks(true);
    }
}