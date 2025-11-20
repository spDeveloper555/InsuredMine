const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { MemoryStore } = require('express-rate-limit');
const requestIp = require('request-ip');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const UtilityService = require('./services/utility.service');
const MongoDriver = require('./core/drivers/mongo');
const genericRouter = require('./routes/genericRouter');
const cronScheduler = require('./cron/cronScheduler');

const app = express();
const router = express.Router();

const accountRateLimiter = rateLimit({
    windowMs: 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    store: new MemoryStore(),
    keyGenerator: (req) => {
        const accountId = req.headers['x-account-id'];
        const ip = requestIp.getClientIp(req);
        return accountId || ip;
    },
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Rate limit exceeded: Max 5 requests per second per account.',
        });
    },
});

let redirectRef = {};

class Main {
    constructor() {
        this.app = app;
        this.router = router;
        this.utility = new UtilityService();
        this.mongo = new MongoDriver();
        this.init();

        process.on("uncaughtException", (err) => {
            this.logError(err);
        });
        process.on("unhandledRejection", (err) => {
            this.logError(err);
        });
    }

    logError(err) {
        console.log(err);
    }

    init() {
        this.routerInitialization();
        process.on("uncaughtException", (err) => {
            this.logError(err);
        });
        process.on("unhandledRejection", (err) => {
            this.logError(err);
        });


    }

    logError(err) {
        console.log(err);
    }

    async routerInitialization() {
        this.initializeMiddlewares();
        this.initWorkers();
        this.routerRecursive(genericRouter);

        this.app.use('/', accountRateLimiter);

        this.app.use('/api', this.router);

        app.use(cors({ origin: '*' }));

        this.appListen();

        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                message: 'Route not found.'
            });
        });
    }
    initWorkers() {
        const scopeObj = {
            db: this.mongo,
            utility: this.utility,
        };
        new cronScheduler(scopeObj);
    }
    initializeMiddlewares() {
        this.app.use(cors());
        this.app.use(helmet());
        this.app.use(requestIp.mw());
        this.app.use(express.json({ limit: '5mb' }));
    }

    routerRecursive(routeList, urlpath = '') {
        for (const item of routeList) {
            const newPath = (urlpath + '/' + item.path).replace(/\/+/g, '/');

            if (item.rateLimit) {
                this.app.use(newPath, accountRateLimiter);
            }

            if (item.redirectTo) {
                redirectRef[newPath] = item.redirectTo;
                this.app.use(newPath, (req, res) => {
                    const redirectTarget = '/' + item.redirectTo.replace(/^\/+/, '');
                    res.redirect(307, redirectTarget);
                });
                continue;
            }

            if (item.controller && item.action) {
                this.routerActionSelection(item, newPath);
            }

            if (Array.isArray(item.children) && item.children.length > 0) {
                this.routerRecursive(item.children, newPath);
            }
        }
    }

    routerActionSelection(item, routerPath = '') {
        if (item.redirectTo || redirectRef[routerPath]) return;

        const controllerAction = async (req, res) => {
            try {
                const scopeObject = {
                    req,
                    res,
                    db: this.mongo,
                    utility: this.utility,
                };

                const ControllerClass = item.controller;

                if (typeof ControllerClass !== 'function') {
                    throw new Error(`Invalid controller for route: ${routerPath}`);
                }

                const controller = new ControllerClass(scopeObject);
                const action = item.action;

                if (typeof controller[action] !== 'function') {
                    throw new Error(`Action '${action}' not found in controller for route: ${routerPath}`);
                }

                await controller[action]();
            } catch (err) {
                console.error(`Error handling route ${routerPath}:`, err);
                if (!res.headersSent) {
                    res.status(500).send('Internal Server Error');
                }
            }
        };

        const storage = multer.diskStorage({
            destination: (req, file, cb) => {

                cb(null, path.join(__dirname, './assets/uploads') )
            },
            filename: (req, file, cb) => {
                cb(null, file.originalname)
            }
        });

        const upload = multer({ storage: storage });

        const method = String(item.type || '').toLowerCase();
        const middlewares = Array.isArray(item.middlewares) ? item.middlewares : [];

        switch (method) {
            case 'get':
                this.router.get(routerPath, ...middlewares, controllerAction);
                break;
            case 'post':
                this.router.post(routerPath, upload.array("files"), ...middlewares, controllerAction);
                break;
            case 'put':
                this.router.put(routerPath, ...middlewares, controllerAction);
                break;
            case 'delete':
                this.router.delete(routerPath, ...middlewares, controllerAction);
                break;
            default:
                this.router.all(routerPath, (req, res) => res.status(403).send('Forbidden'));
        }
    }

    appListen() {
        const PORT = process.env.PORT || 3000;
        this.app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
}

new Main();

