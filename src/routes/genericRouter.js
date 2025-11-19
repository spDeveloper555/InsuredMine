const TaskController = require("../controllers/task/TaskController");

module.exports = [
    {
        path : 'task',
        children:  TaskController
    }
];

