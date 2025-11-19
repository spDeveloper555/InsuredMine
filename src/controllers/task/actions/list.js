const list = async (scope) => {
    try {
        let { search, page = 1, limit = 20 } = scope.req.body;

        page = Number(page);
        limit = Number(limit);

        let query = { status: 1 };

        if (search && search.trim() !== "") {
            query.first_name = await scope.utility.strSearch(search);
        }

        const skip = (page - 1) * limit;

        const total = await scope.db.count(query, "users");

        if (skip >= total) {
            return scope.res.status(200).json({
                status: "success",
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                data: []
            });
        }

        const pipeline = [
            { $match: query },

            { $skip: skip },
            { $limit: limit },

            {
                $lookup: {
                    from: "policies",
                    localField: "user_id",
                    foreignField: "user_id",
                    as: "policies",
                    pipeline: [
                        {
                            $project: {
                                _id: 0,
                                status: 0,
                                updated_at: 0,
                                created_at: 0
                            }
                        }
                    ]
                }
            },

            {
                $unwind: {
                    path: "$policies",
                    preserveNullAndEmptyArrays: true
                }
            },

            {
                $lookup: {
                    from: "policy_agents",
                    localField: "policies.agent_id",
                    foreignField: "agent_id",
                    as: "agent",
                    pipeline: [
                        {
                            $project: {
                                _id: 0,
                                status: 0,
                                created_at: 0
                            }
                        }
                    ]
                }
            },
            { $unwind: { path: "$agent", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "policy_carriers",
                    localField: "policies.carrier_id",
                    foreignField: "carrier_id",
                    as: "carrier",
                    pipeline: [
                        {
                            $project: {
                                _id: 0,
                                status: 0,
                                created_at: 0
                            }
                        }
                    ]
                }
            },
            { $unwind: { path: "$carrier", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "policy_categories",
                    localField: "policies.category_id",
                    foreignField: "category_id",
                    as: "lob",
                    pipeline: [
                        {
                            $project: {
                                _id: 0,
                                status: 0,
                                created_at: 0
                            }
                        }
                    ]
                }
            },
            { $unwind: { path: "$lob", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "accounts",
                    localField: "user_id",
                    foreignField: "user_id",
                    as: "accounts",
                    pipeline: [
                        {
                            $project: {
                                _id: 0,
                                status: 0,
                                created_at: 0
                            }
                        }
                    ]
                }
            },

            {
                $project: {
                    _id: 0,
                    user_id: 1,
                    first_name: 1,
                    dob: 1,
                    address: 1,
                    phone: 1,
                    state: 1,
                    zipcode: 1,
                    email: 1,
                    gender: 1,
                    user_type: 1,
                    accounts: 1,
                    policy: "$policies",
                    agent: "$agent",
                    carrier: "$carrier",
                    lob: "$lob"
                }
            }
        ];

        const data = await scope.db.aggregate(pipeline, "users");
        let response = {
            status: "success",
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data
        };
        scope.res.status(200).json(response);
    } catch (error) {
        console.log(error);
        scope.res.status(400).json({
            status: "failure",
            message: error.message || "Unable to get list."
        });
    }
};

module.exports = list;
