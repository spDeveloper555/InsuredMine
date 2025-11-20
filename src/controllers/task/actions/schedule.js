const schedule = async (scope) => {
    try {
        let { message, day, time } = scope.req.body;

        const doc = {
            task_id: scope.utility.generateId(),
            message,
            day,
            time,
            status: 1,
            created_at: new Date()
        };
        await scope.db.insert(doc, "schedules");

        scope.res.status(200).json({ status: "success", message: "Message scheduled successfully" });
    } catch (err) {
        scope.res.status(500).json({ status: "failure", error: err.message || "Unable to schedule message." });
    }
};

module.exports = schedule;
