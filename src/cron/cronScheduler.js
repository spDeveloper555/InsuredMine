const cron = require("node-cron");
const insertMessage = require("./actions/inserMessage");
const print_cpu_usage = require("./actions/cpuMonitor");

class cronScheduler {
    constructor(scope) {
        this.scopeObj = scope;
        this.init();
    }
    init() {
        this.runs_each_minute();
        this.runs_each_five_seconds();

    }
    runs_each_minute() {
        cron.schedule("* * * * *", () => {
            insertMessage(this.scopeObj).catch((err) => { console.log(err) });
        });
    }
    runs_each_five_seconds() {
        cron.schedule("*/5 * * * * *", () => {
            print_cpu_usage();
        });
    }

}
module.exports = cronScheduler;


