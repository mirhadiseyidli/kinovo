const User = require('../database/schemas/usersSchema');

const searchPeople = async (req, res) => {
    try {
        const { term } = req.query; // Search query from frontend

        if (!term) {
            return res.status(400).json({ error: 'Search term is required.' });
        }

        // Query both users and drones collections in parallel
        const users = await User.find({
            $or: [
                { email: { $regex: term, $options: 'i' } },
                { username: { $regex: term, $options: 'i' } },
                { first_name: { $regex: term, $options: 'i' } },
                { last_name: { $regex: term, $options: 'i' } },
                { full_name: { $regex: term, $options: 'i' } },
                { phone_number: { $regex: term, $options: 'i' } }
            ]
        });

        // Combine the results into one response
        const results = {
            users,
        };

        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to search users and drones' });
    }
};

module.exports = { searchPeople };
