const MongoClient = require("mongodb").MongoClient;
const indexing = require('./../config/mongo_indexes');

class MongoDriver {
  constructor() {
    this.client = null;
    this.url = process.env.DB_URI;
    this.dbName = process.env.DB_NAME;
    this.indexing = indexing;
    this.recordsLimit = 100;
    this.dbInit();
  }
  dbInit() {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          let client = new MongoClient(this.url, {});
          await client.connect().catch((e) => {
            console.error("connect error", e);
          });
          this.client = client;
          this.collectionSetup();
          resolve(client);
        } catch (error) {
          reject(error);
        }
      })();
    });
  }
  async collectionSetup() {
    const collections = indexing.collectionSetup;
    try {
      for (let collectionName of collections) {
        await this.createCollection(collectionName).catch((error) => { });
      }
      this.loadEnsureIndex();
    } catch (error) {
      console.log(error)
    }
  }
  async loadEnsureIndex() {
    let indexes = indexing.createIndex;
    let index = Object.keys(indexes);
    for (index of indexes) {
      const collections = Object.keys(index);
      for (let collection of collections) {
        const param = index[collection];
        if (Object.keys(param[0]).length > 0) this.ensureIndex(param[0], collection, param[1] ? param[1] : null);
      }
    }
  }

  ensureIndex(doc, collectionName, options) {
    return new Promise((resolve, reject) => {
      try {
        const db = this.client.db(this.dbName);
        const collection = db.collection(collectionName);
        collection.createIndex(
          doc,
          options,
          (err, result) => {
            if (err) reject(err);
            resolve(result);
          }
        )
      } catch (error) {
        reject(error)
      }
    })
  }

  createCollection(collectionName) {
    return new Promise((resolve, reject) => {
      const db = this.client.db(this.dbName);
      db.createCollection(collectionName, function (err, result) {
        if (err) reject(err);
      });
      resolve("Collection is created!");
    });
  }

  isConnected() {
    try {
      return (
        !!this.client &&
        !!this.client.topology &&
        this.client.topology.isConnected()
      );
    } catch (error) {
      return false;
    }
  }

  insert(data = {}, collectionName = "", options = {}) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          if (!this.isConnected()) await this.dbInit();
          const db = this.client.db(this.dbName);
          const collection = db.collection(collectionName);
          let result = await collection.insertOne(data).catch((error) => { throw error });
          resolve(result?.insertedId + "");
        } catch (error) {
          console.log(" insert query ", error);
          reject(error);
        }
      })()
    });
  }

  insertMany(data = [], collectionName = "", options = {}) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          if (!this.isConnected()) await this.dbInit();
          const db = this.client.db(this.dbName);
          const collection = db.collection(collectionName);
          let result = await collection.insertMany(data, { ordered: false }).catch((error) => { throw error });
          resolve(result?.['insertedCount']);
        } catch (error) {
          reject(error);
        }
      })()
    });
  }
  updateMany(query = {}, data = {}, collectionName = "", options = {}) {

    return new Promise((resolve, reject) => {
      (async () => {
        try {
          if (!this.isConnected()) await this.dbInit();
          const db = this.client.db(this.dbName);
          const collection = db.collection(collectionName);

          collection.updateMany(
            query,
            { $set: data },
            { upsert: true },
            (err, result) => {
              if (err) reject(err);
              resolve(result?.["result"]["ok"]);
            }
          );
        } catch (error) {
          console.log("update Error", error);
          reject(error);
        }
      })()
    });
  }
  update(query = {}, data = {}, collectionName = "", options = {}) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          if (!this.isConnected()) await this.dbInit();
          const db = this.client.db(this.dbName);
          const collection = db.collection(collectionName);

          let result = await collection.updateOne(query, { $set: data }, { upsert: true });
          resolve(result);
        } catch (error) {
          console.log("update Error", error);
          reject(error);
        }
      })()
    });
  }
  regExp(str) {
    return new RegExp(str, "i");
  }
  findOne(query, collectionName, extra = {}) {
    return new Promise((resolve, reject) => {
      (async () => {
        let options = {};
        if (extra.projection) {
          options.projection = extra.projection;
        } else {
          options.projection = null;
        }
        const db = await this.client.db(this.dbName);
        const collection = db.collection(collectionName);
        let findOne = await collection.findOne(query, options);
        resolve(findOne || {});
      })()
    });
  }
  find(query, collectionName, options = {}) {
    return new Promise((resolve, reject) => {
      (async () => {
        if (!this.isConnected()) await this.dbInit();
        const db = this.client.db(this.dbName);
        const collection = db.collection(collectionName);
        let projection = (typeof options['projection'] === 'object') ? options['projection'] : {};
        let sort = (typeof options['sort'] === 'object') ? options['sort'] : {};
        let limit = (typeof options['limit'] === 'number') ? options['limit'] : this.recordsLimit;
        let skip = (typeof options['skip'] === 'number') ? options['skip'] : 0;
        let findData = await collection.find(query, { projection, limit, skip, sort }).toArray();
        resolve(findData);
      })()
    });
  }

  async count(searchQuery, collectionName) {
    try {
      if (!this.isConnected()) {
        await this.dbInit();
      }

      const db = this.client.db(this.dbName);
      const collection = db.collection(collectionName);

      return await collection.countDocuments(searchQuery);

    } catch (err) {
      console.error("Count error:", err);
      throw err;
    }
  }


  sleep(ms) {
    return new Promise((resolve) => { setTimeout(() => { resolve(true) }, ms); })
  }

  async findAll(searchQuery = {}, collectionName, options = {}) {
    try {
      if (!this.isConnected()) await this.dbInit();

      const db = this.client.db(this.dbName);
      const collection = db.collection(collectionName);

      const projection = options.projection || {};
      const sort = options.sort || {};

      const limit = 100;

      const cursor = collection
        .find(searchQuery)
        .project(projection)
        .sort(sort)
        .batchSize(limit);

      const result = [];

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        result.push(doc);
      }

      return result;

    } catch (err) {
      console.error("findAll error:", err);
      return [];
    }
  }



  async aggregate(pipeline, collectionName) {
    try {
      if (!this.isConnected()) await this.dbInit();

      const collection = this.client.db(this.dbName).collection(collectionName);

      return await collection.aggregate(pipeline, { allowDiskUse: true }).toArray();

    } catch (err) {
      console.error("aggregate error:", err);
      throw err;
    }
  }



  createIndex(index = {}, collectionName = "", options = {}) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          if (!this.isConnected()) await this.dbInit();
          const db = this.client.db(this.dbName);
          const collection = db.collection(collectionName);

          collection.createIndex(index, options).then((indexes) => {
            resolve(indexes);
          });
        } catch (error) {
          reject(error);
        }
      })()
    });
  }

  async randomID(collectionName = "", field = "uniqueId", length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const generateId = () => {
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    try {
      if (!this.isConnected()) await this.dbInit();
      const db = this.client.db(this.dbName);
      const collection = db.collection(collectionName);

      let newId;
      let exists = true;

      while (exists) {
        newId = generateId();
        exists = await collection.findOne({ [field]: newId });
      }

      return newId;
    } catch (error) {
      console.error("randomID error:", error);
      throw error;
    }
  }
  async generateOrderID(collectionName = "", field = "uniqueId", prefix = "SAK") {
    try {
      if (!this.isConnected()) await this.dbInit();
      const db = this.client.db(this.dbName);
      const collection = db.collection(collectionName);

      const latestDoc = await collection
        .find({ [field]: { $regex: `^${prefix}-\\d+$` } })
        .sort({ 'createdAt': -1 })
        .limit(1)
        .toArray();

      let nextNumber = 1;

      if (latestDoc.length > 0) {
        const latestId = latestDoc[0][field];
        const parts = latestId.split("-");
        const number = parseInt(parts[1], 10);
        nextNumber = number + 1;
      }

      return `${prefix}-${nextNumber}`;
    } catch (error) {
      console.error("randomID error:", error);
      throw error;
    }
  }

};
module.exports = MongoDriver;
