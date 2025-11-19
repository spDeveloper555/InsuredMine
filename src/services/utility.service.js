
class UtilityService {
    generateId() {
        let id = Date.now() + '' + Math.floor(Math.random() * 1000)
        return Number(id);
    }
    searchQuery(value, keys, idKey) {
        let query = {};
        if (value) {
            const escaped = new RegExp(this.clean(str), "i");
            query.$or = keys.map(key => ({ [key]: { $regex: escaped, $options: 'i' } }));
            if (!isNaN(Number(value)) && idKey) {
                query['$or'].push({ [idKey]: +value });
            }
        }
        return query;
    }
    strSearch(value) {
        const cleanValue = this.clean(value);

        return {
            $regex: cleanValue,
            $options: "i"
        };
    }

    clean(value) {
        if (value instanceof Object) {
            for (let key in value) {
                if (/^\$/.test(key)) {
                    delete value[key];
                }
            }
        }
        return value;
    }

    chunk(arr, size = 100) {
        return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
            arr.slice(i * size, i * size + size)
        );
    }

    getTodayDay() {
        return new Date().toLocaleString("en-US", { weekday: "long" });
    }

    getCurrentTime() {
        const d = new Date();
        let h = String(d.getHours()).padStart(2, "0");
        let m = String(d.getMinutes()).padStart(2, "0");
        return `${h}:${m}`;
    }
}
module.exports = UtilityService;