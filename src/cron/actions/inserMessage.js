const { stat } = require("fs");

const insertMessage = (scope) => {
    return new Promise((resolve, reject) => {
        (async () => {
            try {
                const today = scope.utility.getTodayDay();
                const now = scope.utility.getCurrentTime();
                let query = {
                    day: today,
                    time: now,
                    status: 1
                };
                const tasks = await scope.db.findAll(query, "schedules", { projection: { _id: 0, task_id: 1, message: 1 } });

                for (const t of tasks) {
                    let doc = {
                        message: t.message,
                        created_at: new Date(),
                        status: 1,
                        task_id: t.task_id,
                        message_type: "scheduled",
                        message_id: scope.utility.generateId()
                    }
                    await scope.db.insert(doc, "messages_log");
                    await scope.db.update({ task_id: t.task_id, status: 1 }, { last_update: Date.now() }, "schedules");
                }
                resolve(1);
            } catch (err) {
                reject(err);
            }
        })();
    })
}

module.exports = insertMessage;