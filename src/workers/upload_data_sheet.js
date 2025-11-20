const XLSX = require("xlsx");
const fs = require("fs");
const { parse } = require("csv-parse");
const { workerData, parentPort } = require("worker_threads");

const UtilityService = require('./../services/utility.service');
const MongoDriver = require('./../core/drivers/mongo');
require('dotenv').config();

(async () => {
    try {
        const { filePath, filename } = workerData;
        const utility = new UtilityService();
        const mongo = new MongoDriver();

        const scope = {
            db: mongo,
            utility: utility
        };

        const result = await start_store_data(scope, filePath, filename);
        setTimeout(() => {
            try { fs.unlinkSync(filePath); } catch (e) { console.error(e); }
        }, 200);

        parentPort.postMessage({ inserted: result.insertedCount });

    } catch (err) {
        parentPort.postMessage({ error: err.message });
    }
})();
async function start_store_data(scope, filePath, filename) {
    try {

        if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);


        if (filename.endsWith(".csv")) {
            const CHUNK_SIZE = 1000;
            const parser = fs.createReadStream(filePath).pipe(parse({ columns: true, skip_empty_lines: true, trim: true }));
            let chunk = [];

            for await (const row of parser) {
                chunk.push(row);
                if (chunk.length >= CHUNK_SIZE) {
                    await store_data_in_db(scope, chunk);
                    chunk.length = 0;
                }
            }

            if (chunk.length > 0) {
                await store_data_in_db(scope, chunk);
            }

            return true;
        }

        if (filename.endsWith(".xlsx") || filename.endsWith(".xls") || filename.endsWith(".xlsm")) {
            const rows = await processExcel(filePath);
            const CHUNK_SIZE = 1000;
            for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
                const slice = rows.slice(i, i + CHUNK_SIZE);
                await store_data_in_db(scope, slice);
            }
            return true;
        }

        throw new Error(`Unsupported file extension for file: ${filename}`);
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function store_data_in_db(scope, datas) {
    try {
        const BATCH_SIZE = 500;
        const now = Date.now();

        const emailSet = new Set();
        const agentSet = new Set();
        const categorySet = new Set();
        const carrierSet = new Set();
        const policySet = new Set();
        const accountKeySet = new Set();

        for (const d of datas) {
            if (d?.email) emailSet.add(d.email);
            if (d?.agent) agentSet.add(d.agent);
            if (d?.category_name) categorySet.add(d.category_name);
            if (d?.company_name) carrierSet.add(d.company_name);
            if (d?.policy_number) policySet.add(d.policy_number);
            if (d?.account_name) accountKeySet.add(`${d.account_name}::${d.account_type}`);
        }

        const [
            existingUsers,
            existingAgents,
            existingCategories,
            existingCarriers,
            existingPolicies,
            existingAccounts,
        ] = await Promise.all([
            scope.db.findAll({ email: { $in: [...emailSet] }, status: 1 }, 'users', { projection: { email: 1, _id: 0 } }),
            scope.db.findAll({ agent_name: { $in: [...agentSet] }, status: 1 }, 'policy_agents', { projection: { agent_name: 1, _id: 0 } }),
            scope.db.findAll({ category_name: { $in: [...categorySet] }, status: 1 }, 'policy_categories', { projection: { category_name: 1, _id: 0 } }),
            scope.db.findAll({ carrier_name: { $in: [...carrierSet] }, status: 1 }, 'policy_carriers', { projection: { carrier_name: 1, _id: 0 } }),
            scope.db.findAll({ policy_number: { $in: [...policySet] }, status: 1 }, 'policies', { projection: { policy_number: 1, _id: 0 } }),
            scope.db.findAll({ account_name: { $in: [...accountKeySet] }, status: 1 }, 'accounts', { projection: { account_name: 1, account_type: 1, _id: 0 } }),
        ]);

        const existingEmailSet = new Set(existingUsers.map(x => x.email));
        const existingAgentSet = new Set(existingAgents.map(a => a.agent_name));
        const existingCategorySet = new Set(existingCategories.map(c => c.category_name));
        const existingCarrierSet = new Set(existingCarriers.map(c => c.carrier_name));
        const existingPolicySet = new Set(existingPolicies.map(p => p.policy_number));
        const existingAccountSet = new Set(existingAccounts.map(a => `${a.account_name}::${a.account_type}`));

        const newAgentSet = new Set();
        const newCategorySet = new Set();
        const newCarrierSet = new Set();
        const newPolicySet = new Set();
        const newAccountSet = new Set();

        let userBatch = [];
        let agentBatch = [];
        let categoryBatch = [];
        let carrierBatch = [];
        let policyBatch = [];
        let accountBatch = [];

        for (const d of datas) {
            const email = d.email;
            if (!email) continue;

            // USER
            if (existingEmailSet.has(email)) continue;

            const user_id = scope.utility.generateId();
            existingEmailSet.add(email);

            userBatch.push({
                user_id,
                first_name: d.firstname || "",
                email,
                gender: d.gender || "",
                address: d.address || "",
                city: d.city || "",
                state: d.state || "",
                zipcode: d.zip || "",
                phone: d.phone || "",
                user_type: d.userType || "",
                dob: d.dob || "",
                status: 1,
                created_at: now,
            });

            // AGENT
            let agent_id = null;
            const agentName = d.agent;

            if (agentName) {
                if (!existingAgentSet.has(agentName) && !newAgentSet.has(agentName)) {
                    agent_id = scope.utility.generateId();
                    newAgentSet.add(agentName);

                    agentBatch.push({
                        agent_id,
                        agent_name: agentName,
                        status: 1,
                        created_at: now,
                    });
                }
            }

            // CATEGORY
            let category_id = null;
            const categoryName = d.category_name;

            if (categoryName) {
                if (!existingCategorySet.has(categoryName) && !newCategorySet.has(categoryName)) {
                    category_id = scope.utility.generateId();
                    newCategorySet.add(categoryName);

                    categoryBatch.push({
                        category_id,
                        category_name: categoryName,
                        status: 1,
                        created_at: now,
                    });
                }
            }

            // CARRIER
            let carrier_id = null;
            const carrierName = d.company_name;

            if (carrierName) {
                if (!existingCarrierSet.has(carrierName) && !newCarrierSet.has(carrierName)) {
                    carrier_id = scope.utility.generateId();
                    newCarrierSet.add(carrierName);

                    carrierBatch.push({
                        carrier_id,
                        carrier_name: carrierName,
                        status: 1,
                        created_at: now,
                    });
                }
            }

            // POLICY
            const policyNum = d.policy_number;
            if (policyNum && !existingPolicySet.has(policyNum) && !newPolicySet.has(policyNum)) {
                newPolicySet.add(policyNum);

                policyBatch.push({
                    policy_id: scope.utility.generateId(),
                    user_id,
                    agent_id,
                    carrier_id,
                    category_id,
                    policy_number: policyNum,
                    policy_type: d.policy_type || "",
                    policy_mode: d.policy_mode || "",
                    producer: d.producer || "",
                    premium_amount: d.premium_amount || "",
                    premium_amount_written: d.premium_amount_written || "",
                    policy_start_date: d.policy_start_date || "",
                    policy_end_date: d.policy_end_date || "",
                    csr: d.csr || "",
                    status: 1,
                    created_at: now,
                });
            }

            // ACCOUNT
            const accountName = d.account_name || "";
            const accountType = d.account_type || "";
            const accountKey = `${accountName}::${accountType}`;

            if (accountName && !existingAccountSet.has(accountKey) && !newAccountSet.has(accountKey)) {
                newAccountSet.add(accountKey);

                accountBatch.push({
                    account_id: scope.utility.generateId(),
                    user_id,
                    account_name: accountName,
                    account_type: accountType,
                    status: 1,
                    created_at: now,
                });
            }

            if (userBatch.length >= BATCH_SIZE) {
                await Promise.all([
                    userBatch.length ? scope.db.insertMany(userBatch, 'users') : null,
                    agentBatch.length ? scope.db.insertMany(agentBatch, 'policy_agents') : null,
                    categoryBatch.length ? scope.db.insertMany(categoryBatch, 'policy_categories') : null,
                    carrierBatch.length ? scope.db.insertMany(carrierBatch, 'policy_carriers') : null,
                    policyBatch.length ? scope.db.insertMany(policyBatch, 'policies') : null,
                    accountBatch.length ? scope.db.insertMany(accountBatch, 'accounts') : null,
                ]);

                userBatch = [];
                agentBatch = [];
                categoryBatch = [];
                carrierBatch = [];
                policyBatch = [];
                accountBatch = [];
            }
        }

        await Promise.all([
            userBatch.length ? scope.db.insertMany(userBatch, 'users') : null,
            agentBatch.length ? scope.db.insertMany(agentBatch, 'policy_agents') : null,
            categoryBatch.length ? scope.db.insertMany(categoryBatch, 'policy_categories') : null,
            carrierBatch.length ? scope.db.insertMany(carrierBatch, 'policy_carriers') : null,
            policyBatch.length ? scope.db.insertMany(policyBatch, 'policies') : null,
            accountBatch.length ? scope.db.insertMany(accountBatch, 'accounts') : null,
        ]);

        return true;

    } catch (error) {
        console.error("Error in store_data_in_db:", error);
        throw error;
    }
}



async function processExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: null });
}
