const Mongo_indexes = {
    createIndex: [
        {
            'users': [{ user_id: 1, email: 1}]
        }
    ],
    collectionSetup: [
        'users',
        'policy_agents',
        'policy_categories',
        'policy_carriers',
        'policies',
        'accounts'
    ]
}
module.exports = Mongo_indexes;