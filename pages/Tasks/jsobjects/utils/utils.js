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
    
    // Debug function to log the current state
    logState: function() {
        console.log('Current state:', {
            selectedTask: this.selectedTask,
            showCompleted: this.showCompleted,
            listState: this.listState,
            taskCount: this.tasks ? this.tasks.length : 0
        });
        return true;
    },

    // CRUD Operations
    
    // Create a new task
    createTask: function(taskData) {
        // Generate a random ID for the new task
        const newId = Math.floor(Math.random() * 10000) + 1;
        
        // The createTask query uses form field values directly
        // We just need to set the ID parameter
        return createTask.run({
            id: newId
        }).then(response => {
            return this.getAllTasks(true).then(() => {
                const newTask = this.tasks.find(t => t.id === newId);
                if (newTask) {
                    return { success: true, data: newTask };
                }
                return { success: true, data: response || { id: newId } };
            });
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
                // Map database fields to our expected format if needed
                this.tasks = this.tasks.map(task => ({
                    ...task,
                    status: task.is_complete ? 'completed' : 'pending',
                    dueDate: task.deadline,
                    description: task.comment
                }));
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
        
        // Handle null or undefined tasks array
        if (!filteredTasks || filteredTasks.length === 0) {
            return { success: true, data: [] };
        }
        
        switch (this.listState) {
            case this.LIST_STATES.TODAY:
                filteredTasks = filteredTasks.filter(task => {
                    // Check if deadline is today (if it exists)
                    if (!task || !task.deadline) return false;
                    const taskDate = typeof task.deadline === 'string' ? task.deadline.split('T')[0] : null;
                    return taskDate === today && !task.is_complete;
                });
                break;
                
            case this.LIST_STATES.UPCOMING:
                filteredTasks = filteredTasks.filter(task => {
                    // Check if deadline is in the future (if it exists)
                    if (!task || !task.deadline) return false;
                    const taskDate = typeof task.deadline === 'string' ? task.deadline.split('T')[0] : null;
                    return taskDate && taskDate > today && !task.is_complete;
                });
                break;
                
            case this.LIST_STATES.COMPLETED:
                filteredTasks = filteredTasks.filter(task => task && task.is_complete);
                break;
                
            case this.LIST_STATES.ALL:
            default:
                // Show all tasks
                filteredTasks = filteredTasks.filter(task => task !== null && task !== undefined);
        }
        
        // Sort tasks by completion status, due date and priority
        filteredTasks.sort((a, b) => {
            // Handle null or undefined values
            if (!a) return 1;
            if (!b) return -1;
            
            // Sort by completion status (incomplete first)
            if (a.is_complete !== b.is_complete) {
                return a.is_complete ? 1 : -1;
            }
            
            // Then by due date if available
            if (a.deadline && b.deadline && a.deadline !== b.deadline) {
                try {
                    return new Date(a.deadline) - new Date(b.deadline);
                } catch (e) {
                    // If date parsing fails, just compare strings
                    return String(a.deadline).localeCompare(String(b.deadline));
                }
            }
            
            // Tasks with deadlines come before tasks without deadlines
            if (a.deadline && !b.deadline) return -1;
            if (!a.deadline && b.deadline) return 1;
            
            // Then by priority (high to low)
            const priorityOrder = { HIGH: 1, MEDIUM: 2, LOW: 3 };
            const aPriority = a.priority && priorityOrder[a.priority] ? priorityOrder[a.priority] : 2;
            const bPriority = b.priority && priorityOrder[b.priority] ? priorityOrder[b.priority] : 2;
            return aPriority - bPriority;
        });
        
        return { success: true, data: filteredTasks };
    },
    
    // Update a task
    updateTask: function(taskId, updateData) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            return Promise.resolve({ success: false, error: 'Task not found' });
        }
        
        // Set the selected task for the query
        // The query will directly use the form field values
        this.setSelectedTask(this.tasks[taskIndex]);
        
        // Make sure the form fields are populated with the task data
        // This is handled by the modal's onOpen event
        
        // Run the update query
        return updateTask.run().then(response => {
            return this.getAllTasks(true).then(() => {
                const updatedTask = this.tasks.find(t => t.id === taskId);
                if (updatedTask) {
                    return { success: true, data: updatedTask };
                }
                return { success: false, error: 'Failed to update task' };
            });
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
        
        // Set the selected task for the query
        this.setSelectedTask(task);
        
        // Run the update query
        return updateTaskIsComplete.run()
            .then(response => {
                // Force refresh the tasks list
                return this.getAllTasks(true);
            })
            .then(() => {
                // Find the updated task
                const updatedTask = this.tasks.find(t => t.id === taskId);
                if (updatedTask) {
                    return { success: true, data: updatedTask };
                }
                return { success: false, error: 'Failed to toggle task completion' };
            })
            .catch(error => {
                console.error('Error toggling task completion:', error);
                return { success: false, error: error.message || 'Unknown error' };
            });
    },
    
    // Handler for task toggle checkbox (to avoid if-else in widget handlers)
    handleTaskToggle: function(triggeredItem) {
        // Set the selected task
        this.setSelectedTask(triggeredItem);
        
        // Toggle the task completion
        return this.toggleTaskCompletion(triggeredItem.id)
            .then((result) => {
                // Show success alert
                result.success 
                    ? showAlert('Task Status Updated!', 'success') 
                    : showAlert('Error updating task status: ' + (result.error || 'Unknown error'), 'error');
                
                // Refresh tasks list
                return result.success ? this.getAllTasks(true) : result;
            })
            .catch(() => {
                showAlert('Error updating task status', 'error');
                return { success: false };
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
    },
    
    // Page load function - call this when the page loads
    onPageLoad: function() {
        // Initialize tasks
        this.initialize();
        
        // Reset selected task
        this.setSelectedTask(null);
        
        // Set default list state if not already set
        if (!this.listState) {
            this.setListState(this.LIST_STATES.TODAY);
        }
        
        // Log the initial state for debugging
        this.logState();
        
        // Return success
        return { success: true, message: "Tasks page initialized successfully" };
    },
    
    // Helper function to safely parse dates
    parseDate: function(dateString) {
        if (!dateString) return null;
        try {
            return new Date(dateString);
        } catch (e) {
            console.error('Error parsing date:', dateString, e);
            return null;
        }
    },
    
    // Combined function to save a task (create or update)
    saveTask: function() {
        // Get form values
        const taskData = {
            title: inp_updateTaskTitle.text,
            description: inp_updateTaskComment.text,
            dueDate: dat_updateTaskDeadline.formattedDate,
            priority: sel_updateTaskPriority.selectedOptionValue
        };
        
        // Determine if this is an update or create operation
        const isUpdate = this.selectedTask !== null;
        
        // Call the appropriate function
        let promise;
        
        if (isUpdate) {
            promise = this.updateTask(this.selectedTask.id, taskData);
        } else {
            promise = this.createTask(taskData);
        }
        
        // Handle the result
        return promise.then((result) => {
            if (result.success) {
                const action = isUpdate ? 'updated' : 'created';
                showAlert(`Task ${action} successfully!`, 'success');
                closeModal('mdl_editTask');
                return this.getAllTasks(true);
            } else {
                const action = isUpdate ? 'updating' : 'creating';
                showAlert(`Error ${action} task: ${result.error || 'Unknown error'}`, 'error');
                return result;
            }
        }).catch(error => {
            const action = isUpdate ? 'updating' : 'creating';
            showAlert(`Error ${action} task`, 'error');
            return { success: false, error: error.message || 'Unknown error' };
        });
    }
}