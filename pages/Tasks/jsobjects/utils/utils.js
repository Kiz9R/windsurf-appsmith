export default {
	selectedTask: undefined,

	showCompleted: true,

	listState: 'today',

	setListState: (listState) => {
		this.listState = listState;
	},

	setSelectedTask: (task) => {
		this.selectedTask = task;
	},

	toggleShowCompleted: () => {
		this.showCompleted = !this.showCompleted;
	},



}