const Drone = require('../database/schemas/droneSchema');
const DroneStats = require('../database/schemas/droneStatSchema');
const User = require('../database/schemas/userSchema');
const slackActions = require('../utils/slackActions');
const cron = require('node-cron');

const crypto = require('crypto');

const updateMonthlyStats = async () => {
  const currentMonth = new Date();
  currentMonth.setUTCDate(1);
  currentMonth.setUTCHours(0, 0, 0, 0);

  const drones = await Drone.find({});
  const dronesInUse = drones.filter(drone => drone.asset_status.toLowerCase() === 'in use');
  const dronesInStock = drones.filter(drone => drone.asset_status.toLowerCase() === 'in stock');
  const dronesAvailable = drones.filter(drone => drone.asset_status.toLowerCase() === 'available');
  const dronesUnavailable = drones.filter(drone => drone.asset_status.toLowerCase() === 'unavailable');
  const totalDroneValue = drones.reduce((acc, drone) => acc + (drone.drone_value || 0), 0);

  let stats = await DroneStats.findOne({ month: currentMonth });

  if (!stats) {
    stats = new DroneStats({
      month: currentMonth,
      total_drones: drones.length,
      drones_in_use: dronesInUse.length,
      drones_in_stock: dronesInStock.length,
      drones_available: dronesAvailable.length,
      drones_unavailable: dronesUnavailable.length,
      total_drone_value: totalDroneValue,
    });
  } else {
    stats.total_drones = drones.length;
    stats.drones_in_use = dronesInUse.length;
    stats.drones_in_stock = dronesInStock.length;
    stats.drones_available = dronesAvailable.length,
    stats.drones_unavailable = dronesUnavailable.length,
    stats.total_drone_value = totalDroneValue;
  }

  await stats.save();
};

const getDrones = async (req, res) => {
  try {
    const drones = await Drone.find().populate([{ path: 'assigned_to' }, { path: 'approval_requester' }]);
    res.status(200).json(drones);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get Drones' });
  }
};

const requestDrone = async (req, res) => {
  const { id } = req.params;
  const drone = await Drone.findOne({ id: id }).populate('assigned_to').populate('approval_requester');
  const requestingUser = await User.findOne({ google_id: req.user.id})
  console.log(requestingUser)
  const assignedUser = drone.assigned_to;

  if (drone.assigned_to) {
      try {
          const hash = generateHash();
          const channelName = `drone-request-${drone._id}-${hash}`;
          const assigned_user_slack_id = await slackActions.getUserIdByEmail(assignedUser.email);
          const requesting_user_slack_id = await slackActions.getUserIdByEmail(requestingUser.email);
          const channelId = await slackActions.createChannel(channelName);
          await slackActions.inviteUsersToChannel(channelId, [requesting_user_slack_id, assigned_user_slack_id]);
          await slackActions.postApprovalMessage(channelId, requestingUser, id);
          drone.approval_requested = true;
          drone.approval_requester = requestingUser._id;
          await drone.save();

          res.status(200).json({ message: 'Approval request submitted' });
      } catch (error) {
          res.status(500).json({ message: 'Failed to create approval workflow' });
      }
  } else {
      // Submit a ticket to Freshservice
      console.log('submitting a ticket');
      res.status(200).json({ message: 'Ticket submitted' });
  }

  res.status(200).json({ message: 'Request submitted' });
};

const createDrone = async (req, res) => {
  try {
    const { assigned_to, approval_requester, ...droneData } = req.body;
    let user;
    let requester;

    if (assigned_to) {
      user = await User.findOne({ email: assigned_to });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      droneData.assigned_to = user._id;
    }

    if (approval_requester) {
      requester = await User.findOne({ email: approval_requester });
      if (!requester) {
        return res.status(404).json({ message: 'User not found' });
      }
      droneData.approval_requester = user._id;
    }
    const drone = await Drone.create(droneData);
    await updateMonthlyStats();
    res.status(201).json(drone);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteDrone = async (req, res) => {
  const { id } = req.params
  try {
    const drone = await Drone.findOneAndDelete({ _id: id })
    await updateMonthlyStats();
    res.status(200).json(drone);
  } catch (err) {
      res.status(400).json({ message: err.message });
  };
}

const editDrone = async (req, res) => {
  const { id } = req.params;
  const updateFields = req.params;

  try {
    const drone = await Drone.findOneAndUpdate(
      { _id: id }, 
      { $set: updateFields }, 
      { new: true } 
    );

    if (!drone) {
      return res.status(404).json({ message: 'Drone not found' });
    }
    await updateMonthlyStats();
    res.status(200).json(drone);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const getDroneStat = async (req, res) => {
  const currentMonth = new Date();
  currentMonth.setUTCDate(1);
  currentMonth.setUTCHours(0, 0, 0, 0);

  const lastMonth = new Date(currentMonth);
  lastMonth.setUTCDate(1);
  lastMonth.setUTCHours(0, 0, 0, 0);
  lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);

  try {
    const currentStats = await DroneStats.findOne({ month: currentMonth });
    const lastMonthStats = await DroneStats.findOne({ month: lastMonth });
    res.status(200).json({
      currentStats,
      lastMonthStats,
    });
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

cron.schedule('0 0 * * *', async () => {
  console.log('Running updateMonthlyStats at midnight');
  await updateMonthlyStats();
});

function generateHash() {
  return crypto
      .randomBytes(5)
      .toString('hex');
}

module.exports = { getDrones, requestDrone, createDrone, deleteDrone, editDrone, getDroneStat };
