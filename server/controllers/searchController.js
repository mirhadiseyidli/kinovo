const User = require('../database/schemas/userSchema');
const Drone = require('../database/schemas/droneSchema');

const searchAll = async (req, res) => {
    try {
        const { term } = req.query; // Search query from frontend

        if (!term) {
            return res.status(400).json({ error: 'Search term is required.' });
        }

        // Query both users and drones collections in parallel
        const [users, drones] = await Promise.all([
            User.find({ email: { $regex: term, $options: 'i' } }), // Search users by email
            Drone.find({ name: { $regex: term, $options: 'i' } })   // Search drones by name
        ]);

        // Combine the results into one response
        const results = {
            users,
            drones
        };

        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to search users and drones' });
    }
};

module.exports = { searchAll };
