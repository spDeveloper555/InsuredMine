const { Worker } = require("worker_threads");
const path = require("path");

const uploadFile = (scope) => {
    try {
        if(!scope.req.files || scope.req.files.length === 0) {
            throw new Error("No files uploaded");
        }
        const file = scope.req.files[0];

        const worker = new Worker(
            path.join(__dirname, "./../../../workers/upload_data_sheet.js"),
            {
                workerData: {
                    filePath: file.path,
                    filename: file.filename
                }
            });

        worker.on("message", msg => {
            scope.res.json({
                success: 'success',
                message: "File processed successfully"
            });
        });

        worker.on("error", err => {
            scope.res.status(500).json({
                status: "failure",
                message: err.message || "Worker failed"
            });
        });

        worker.on("exit", code => {
            if (code !== 0) console.error(`Worker stopped with code ${code}`);
        });
    } catch (error) {
        console.log(error);
        scope.res.status(500).json({
            status: "failure",
            message: error.message || "Unable to upload files."
        });
    }


};

module.exports = uploadFile;
