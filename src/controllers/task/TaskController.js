const list = require('./actions/list');
const schedule = require('./actions/schedule');
const { scheduleValidator } = require('../../core/validators/schedule.validator');
const { validate } = require('../../core/middlewares/validate.middleware');

class TaskController {
    constructor(scope) {
        this.scopeObj = scope;
    }
    list() {
        list(this.scopeObj)
    }
    schedule() {
        schedule(this.scopeObj)
    }
}
module.exports = TaskController;

module.exports = [
    {
        path: "list",
        controller: TaskController,
        action: "list",
        type: 'post',
    },
    {
        path: "schedule",
        controller: TaskController,
        action: "schedule",
        type: 'post',
        middlewares: [scheduleValidator, validate]
    }
]