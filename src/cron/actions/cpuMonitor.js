const os = require("os");

const print_cpu_usage = () => {
    return new Promise(resolve => {
        const start = os.cpus();

        setTimeout(() => {
            const end = os.cpus();
            let idle = 0;
            let total = 0;

            for (let i = 0; i < start.length; i++) {
                const startCpu = start[i].times;
                const endCpu = end[i].times;

                const idleDiff = endCpu.idle - startCpu.idle;
                const totalDiff =
                    (endCpu.user - startCpu.user) +
                    (endCpu.nice - startCpu.nice) +
                    (endCpu.sys - startCpu.sys) +
                    (endCpu.irq - startCpu.irq) +
                    idleDiff;

                idle += idleDiff;
                total += totalDiff;
            }

            const usage = 100 - Math.floor((idle / total) * 100);

            if (usage >= 70) console.log("CPU above 70%! Restart server...");
            resolve(1);
        }, 1000);
    });

}
module.exports = print_cpu_usage;
