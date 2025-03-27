const Users = require('../database/schemas/usersSchema');
const FriendRequests = require('../database/schemas/friendRequestsSchema');

const getFriendSuggestions = async (req, res) => {
  // First, get the base user to extract their city & favorite_activities
  const userId = req.user._id;
  const ObjectId = require('mongoose').Types.ObjectId;
  const userObjectId = new ObjectId(userId);
  const baseUser = await Users.findById(userId, {
    friends: 1,
    location: 1,
    favorite_activities: 1,
  });
  
  console.log('Base user:', baseUser);

  const baseCity = baseUser?.location?.city || null;
  const baseActivities = baseUser?.favorite_activities || [];
  const baseFriends = baseUser?.friends || [];

  const pendingRequests = await FriendRequests.find({ sender: userId, status: 'pending' }).select('receiver');
  const pendingReceiverIds = pendingRequests.map(req => req.receiver);

  const suggestions = await Users.aggregate([
    // Stage 1: Get direct friends of user
    {
      $match: {
        _id: { $in: baseFriends }
      }
    },

    // Stage 2: Get their friends (friends of friends)
    {
      $project: {
        friends: 1
      }
    },
    {
      $unwind: '$friends'
    },

    // Stage 3: Group to count mutual friends
    {
      $group: {
        _id: '$friends',
        mutualFriendsCount: { $sum: 1 }
      }
    },

    // Stage 4: Filter out user and already-added friends
    {
      $match: {
        _id: {
          $nin: [...baseFriends, userObjectId, ...pendingReceiverIds]
        }
      }
    },

    // Stage 5: Lookup user info for filtering
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },

    // Stage 6: Compute match metrics
    {
      $addFields: {
        cityMatch: {
          $cond: [
            { $eq: ['$user.location.city', baseCity] },
            1, 0
          ]
        },
        activityMatches: {
          $size: {
            $setIntersection: ['$user.favorite_activities', baseActivities]
          }
        }
      }
    },

    // Stage 7: Compute score (prioritize 3 > 2 > 1 factors)
    {
      $addFields: {
        score: {
          $add: [
            { $multiply: ['$mutualFriendsCount', 3] },
            { $multiply: ['$cityMatch', 2] },
            '$activityMatches'
          ]
        }
      }
    },

    // Stage 8: Final sort
    {
      $sort: {
        score: -1,
        mutualFriendsCount: -1,
        activityMatches: -1,
        cityMatch: -1
      }
    },

    // Stage 9: Shape response
    {
      $project: {
        _id: '$user._id',
        full_name: '$user.full_name',
        username: '$user.username',
        profile_picture: '$user.profile_picture',
        mutualFriendsCount: 1,
        activityMatches: 1,
        cityMatch: 1,
        score: 1
      }
    }
  ]);
  
  res.status(200).json(suggestions);
};

module.exports = { 
  getFriendSuggestions
};