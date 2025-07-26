const User = require('../database/schemas/usersSchema');
const FriendRequests = require('../database/schemas/friendRequestsSchema');
const { sendEmail } = require('../utils/emailService'); // Make sure this exists
const { extractS3KeyFromUrl, deleteFromS3, invalidateCloudFront } = require('../utils/cdnUtils');
const sharp = require('sharp');

require('dotenv').config();

// Helper function to generate default profile picture data URI
const createDefaultProfileImage = async (firstName, lastName) => {
  try {
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    
    // Generate a consistent color based on the user's name
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
      '#eab308', '#22c55e', '#10b981', '#06b6d4', '#3b82f6'
    ];
    const colorIndex = (firstName.charCodeAt(0) + lastName.charCodeAt(0)) % colors.length;
    const backgroundColor = colors[colorIndex];
    
    const size = 400;
    const fontSize = Math.floor(size * 0.35);
    const centerX = size / 2;
    const centerY = size / 2;
    
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${centerX}" cy="${centerY}" r="${size / 2}" fill="${backgroundColor}" />
        <text x="${centerX}" y="${centerY}" 
              font-family="Arial, Helvetica, sans-serif" 
              font-size="${fontSize}" 
              font-weight="bold" 
              fill="white" 
              text-anchor="middle" 
              dy=".35em">${initials}</text>
      </svg>
    `.trim();
    
    // Convert SVG to PNG using Sharp
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
    
    // Convert PNG buffer to base64 data URI
    return `data:image/png;base64,${pngBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Error creating default profile image:', error);
    return null;
  }
};

const getUserProfile = async (req, res) => {
  try {
    // Check for friend request in both directions
    const sentRequest = await FriendRequests.findOne({ 
      sender: req.user._id, 
      receiver: res.user._id 
    });
    
    const receivedRequest = await FriendRequests.findOne({ 
      sender: res.user._id, 
      receiver: req.user._id 
    });

    // Determine the friend request status
    let friendRequest = null;
    if (sentRequest) {
      friendRequest = {
        ...sentRequest.toObject(),
        direction: 'sent' // Current user sent the request
      };
    } else if (receivedRequest) {
      friendRequest = {
        ...receivedRequest.toObject(),
        direction: 'received' // Current user received the request
      };
    }

    // Populate events.event to include visibility and attendees for frontend counts
    const populatedUser = await User.findById(res.user._id)
      .select('-password')
      .populate({
        path: 'events.event',
        select: 'visibility attendees',
      });

    res.status(200).json({ user: populatedUser, friendRequest });
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUsersFriendsList = async (req, res) => {
  try {
    const found_request = await FriendRequests.findOne({ sender: req.user._id, receiver: res.user._id });
    res.status(200).json({ user: res.user, friendRequest: found_request });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteUsers = async (req, res) => {
  let user;
  try {
    user = await User.deleteOne({ _id: res.user._id }).select('-password');

    res.status(200).json('Deleted the user', user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const editMyProfile = async (req, res) => {
  const user_id = req.user._id;
  const updateFields = req.body;

  try {
    const user = await User.findOneAndUpdate(
      { _id: user_id }, 
      { $set: updateFields }, 
      { new: true } 
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    };

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  };
};

const createUser = async (req, res) => {
  try {
    const userData = req.body;


    const user = await User.create(userData);

    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  };
};

const findMe = async (req, res) => {
  try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized: User not logged in' });
      }

      const userId = req.user._id;
      const user = await User.findOne({ _id: userId }).select('-password');
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json(user);
  } catch (error) {
      res.status(500).json({ message: 'Server error' });
  }
};

const getUser = async (req, res, next) => {
  try {
    // Check if the requested user exists
    const requestedUser = await User.findOne({ _id: req.query._id }).select('-password');
    if (!requestedUser) {
      return res.status(404).json({ message: 'Cannot find the user' });
    }

    // Check if current user is blocked by the requested user
    const isBlockedByRequestedUser = requestedUser.blocked_users.some(
      block => block.user.toString() === req.user._id.toString()
    );

    // Check if current user has blocked the requested user
    const currentUser = await User.findById(req.user._id).select('blocked_users');
    const hasBlockedRequestedUser = currentUser.blocked_users.some(
      block => block.user.toString() === requestedUser._id.toString()
    );

    if (isBlockedByRequestedUser || hasBlockedRequestedUser) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.user = requestedUser;
    next();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getUserFriendByEmailSearch = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const email = req.query.query;
    const found_user = await User.findOne({ _id: req.user._id }).populate({
      path: 'friends',
      match: { email: { $regex: email, $options: 'i' } }, // Case-insensitive search
      select: '-password'
    });

    res.status(200).json(found_user.friends);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

const getUserFriendByNameSearch = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const name = req.query.query;
    const found_user = await User.findOne({ _id: req.user._id }).populate({
      path: 'friends',
      match: { $or: [
        { first_name: { $regex: name, $options: 'i' } }, 
        { last_name: { $regex: name, $options: 'i' } },
        { full_name: { $regex: name, $options: 'i' } },
      ]}, // Case-insensitive search by first or last name
      select: '-password'
    });

    res.status(200).json(found_user.friends);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

const markStoriesViewed = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const { friendId, eventIds } = req.body;
    const userId = req.user._id;

    if (!friendId || !eventIds || !Array.isArray(eventIds)) {
      return res.status(400).json({ message: 'Friend ID and event IDs array are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find existing entry for this friend in last_checked_events
    let friendEntry = user.last_checked_events.find(entry => 
      entry.friend.toString() === friendId
    );

    if (friendEntry) {
      // Update existing entry - add new events or update timestamps
      eventIds.forEach(eventId => {
        const existingEvent = friendEntry.viewed_events.find(ve => 
          ve.event.toString() === eventId
        );
        
        if (existingEvent) {
          // Update timestamp for existing event
          existingEvent.viewed_at = new Date();
        } else {
          // Add new event
          friendEntry.viewed_events.push({
            event: eventId,
            viewed_at: new Date()
          });
        }
      });
    } else {
      // Create new entry for this friend
      const newEntry = {
        friend: friendId,
        viewed_events: eventIds.map(eventId => ({
          event: eventId,
          viewed_at: new Date()
        }))
      };
      user.last_checked_events.push(newEntry);
    }
    
    // Mark the field as modified to ensure change stream detection
    user.markModified('last_checked_events');
    
    const savedUser = await user.save();
    
    res.status(200).json({ 
      message: 'Stories marked as viewed successfully',
      viewedCount: eventIds.length
    });
  } catch (error) {
    console.error('Error marking stories as viewed:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Request account deletion
 * This will mark the account for deletion but not immediately delete it
 */
const requestAccountDeletion = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate deletion date (30 days from now)
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    // Mark the account for deletion
    user.delete_requested = true;
    user.deleted_at = deletionDate;
    await user.save();

    // Send email notification
    // try {
    //   await sendEmail({
    //     to: user.email,
    //     subject: 'Account Deletion Request Confirmation',
    //     html: `
    //       <h2>Account Deletion Request Confirmation</h2>
    //       <p>Hello ${user.first_name},</p>
    //       <p>We've received your request to delete your Kinovo account. Your account is scheduled for permanent deletion on ${deletionDate.toLocaleDateString()}.</p>
    //       <p>During this 30-day period:</p>
    //       <ul>
    //         <li>You can still log in to your account</li>
    //         <li>You can cancel the deletion request at any time</li>
    //         <li>After ${deletionDate.toLocaleDateString()}, your account and all associated data will be permanently deleted</li>
    //       </ul>
    //       <p>If you wish to cancel the deletion, please log in to your account and visit the account settings.</p>
    //       <p>If you did not request this deletion, please contact our support team immediately.</p>
    //     `
    //   });
    // } catch (emailError) {
    //   console.error('Failed to send deletion confirmation email:', emailError);
    //   // Continue with the process even if email fails
    // }

    // Send success response
    return res.status(200).json({
      success: true,
      message: 'Account has been marked for deletion. This will be processed within 30 days.',
      deletionDate: deletionDate
    });

  } catch (error) {
    console.error('Error in requestAccountDeletion:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request',
      error: error.message
    });
  }
};

/**
 * Cancel a pending account deletion request
 */
const cancelAccountDeletion = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if there's a pending deletion
    if (!user.delete_requested) {
      return res.status(400).json({
        success: false,
        message: 'No pending deletion request found'
      });
    }

    // Cancel the deletion
    user.delete_requested = false;
    user.deleted_at = null;
    await user.save();

    // Send email notification
    try {
      await sendEmail({
        to: user.email,
        subject: 'Account Deletion Cancelled',
        html: `
          <h2>Account Deletion Cancelled</h2>
          <p>Hello ${user.first_name},</p>
          <p>We're confirming that your account deletion request has been cancelled. Your account will remain active and no data will be deleted.</p>
          <p>If you did not cancel this deletion request, please contact our support team immediately.</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send deletion cancellation email:', emailError);
      // Continue with the process even if email fails
    }

    return res.status(200).json({
      success: true,
      message: 'Account deletion request has been cancelled.'
    });

  } catch (error) {
    console.error('Error in cancelAccountDeletion:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request',
      error: error.message
    });
  }
};

const blockUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const { userId, reason } = req.body;
    
    // Validate userId
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Check if trying to block self
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }

    // Check if user to block exists
    const userToBlock = await User.findById(userId);
    if (!userToBlock) {
      return res.status(404).json({ message: 'User to block not found' });
    }

    // Check if already blocked
    const currentUser = await User.findById(req.user._id);
    const isAlreadyBlocked = currentUser.blocked_users.some(
      blockedUser => blockedUser.user.toString() === userId
    );

    if (isAlreadyBlocked) {
      return res.status(400).json({ message: 'User is already blocked' });
    }

    // Add to blocked users and remove from friends and tags
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $push: {
          blocked_users: {
            user: userId,
            reason: reason || null
          }
        },
        $pull: {
          friends: userId,
          // Remove blocked user from all tags
          'tags.$[].friends': userId
        }
      }
    );

    // Also remove the blocker from the blocked user's friends list and tags
    await User.findByIdAndUpdate(
      userId,
      {
        $pull: {
          friends: req.user._id,
          // Remove blocker from all tags
          'tags.$[].friends': req.user._id
        }
      }
    );

    res.status(200).json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const unblockUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const { userId } = req.body;
    
    // Validate userId
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Check if user to unblock exists
    const userToUnblock = await User.findById(userId);
    if (!userToUnblock) {
      return res.status(404).json({ message: 'User to unblock not found' });
    }

    // Check if actually blocked
    const currentUser = await User.findById(req.user._id);
    const isBlocked = currentUser.blocked_users.some(
      blockedUser => blockedUser.user.toString() === userId
    );

    if (!isBlocked) {
      return res.status(400).json({ message: 'User is not blocked' });
    }

    // Remove from blocked users
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $pull: {
          blocked_users: {
            user: userId
          }
        }
      }
    );

    res.status(200).json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getBlockedUsers = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const user = await User.findById(req.user._id)
      .select('blocked_users')
      .populate('blocked_users.user', 'username full_name profile_picture');

    res.status(200).json({
      blockedUsers: user.blocked_users.map(blocked => ({
        _id: blocked.user._id,
        username: blocked.user.username,
        full_name: blocked.user.full_name,
        profile_picture: blocked.user.profile_picture,
        blocked_at: blocked.blocked_at,
        reason: blocked.reason
      }))
    });
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add a new activity tag
const addActivityTag = async (req, res) => {
  try {
    const { activity_name } = req.body;

    if (!activity_name) {
      return res.status(400).json({ message: 'Activity name is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if tag already exists
    const existingTag = user.tags.find(tag => tag.activity_name === activity_name);
    if (existingTag) {
      return res.status(400).json({ message: 'Tag already exists for this activity' });
    }

    // Add new tag
    user.tags.push({ activity_name, friends: [] });
    await user.save();

    res.status(200).json({ message: 'Activity tag added successfully', tag: user.tags[user.tags.length - 1] });
  } catch (error) {
    console.error('Error adding activity tag:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove an activity tag
const removeActivityTag = async (req, res) => {
  try {
    const { activity_name } = req.body;

    if (!activity_name) {
      return res.status(400).json({ message: 'Activity name is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find and remove the tag
    const tagIndex = user.tags.findIndex(tag => tag.activity_name === activity_name);
    if (tagIndex === -1) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    user.tags.splice(tagIndex, 1);
    await user.save();

    res.status(200).json({ message: 'Activity tag removed successfully' });
  } catch (error) {
    console.error('Error removing activity tag:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add friends to an activity tag
const addFriendsToTag = async (req, res) => {
  try {
    const { activity_name, friend_ids } = req.body;

    if (!activity_name || !friend_ids || !Array.isArray(friend_ids)) {
      return res.status(400).json({ message: 'Activity name and array of friend IDs are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the tag
    const tag = user.tags.find(tag => tag.activity_name === activity_name);
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    // Validate that all friends exist and are actually friends
    const friendsToAdd = await User.find({
      _id: { $in: friend_ids },
      _id: { $in: user.friends }
    });

    if (friendsToAdd.length !== friend_ids.length) {
      return res.status(400).json({ message: 'Some users are not in your friends list' });
    }

    // Add friends to tag if they're not already there
    friend_ids.forEach(friendId => {
      if (!tag.friends.includes(friendId)) {
        tag.friends.push(friendId);
      }
    });

    await user.save();

    // Fetch the updated user with populated friends
    const updatedUser = await User.findById(user._id).populate('tags.friends', 'full_name username profile_picture');
    const updatedTag = updatedUser.tags.find(t => t.activity_name === activity_name);

    res.status(200).json({ 
      message: 'Friends added to tag successfully',
      tag: updatedTag
    });
  } catch (error) {
    console.error('Error adding friends to tag:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove friends from an activity tag
const removeFriendsFromTag = async (req, res) => {
  try {
    const { activity_name, friend_ids } = req.body;

    if (!activity_name || !friend_ids || !Array.isArray(friend_ids)) {
      return res.status(400).json({ message: 'Activity name and array of friend IDs are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the tag
    const tag = user.tags.find(tag => tag.activity_name === activity_name);
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    // Remove friends from tag
    tag.friends = tag.friends.filter(friendId => !friend_ids.includes(friendId.toString()));
    await user.save();

    // Fetch the updated user with populated friends
    const updatedUser = await User.findById(user._id).populate('tags.friends', 'full_name username profile_picture');
    const updatedTag = updatedUser.tags.find(t => t.activity_name === activity_name);

    res.status(200).json({ 
      message: 'Friends removed from tag successfully',
      tag: updatedTag
    });
  } catch (error) {
    console.error('Error removing friends from tag:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all tags with friends
const getUserTags = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('tags.friends', 'full_name username profile_picture');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ tags: user.tags });
  } catch (error) {
    console.error('Error getting user tags:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getFavoriteActivities = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('favorite_activities');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ favorite_activities: user.favorite_activities || [] });
  } catch (error) {
    console.error('Error getting favorite activities:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const addFavoriteActivity = async (req, res) => {
  try {
    const { activity } = req.body;
    if (!activity) {
      return res.status(400).json({ message: 'Activity is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.favorite_activities.includes(activity)) {
      return res.status(400).json({ message: 'Activity already in favorites' });
    }

    user.favorite_activities.push(activity);
    await user.save();

    res.json({ message: 'Activity added to favorites', favorite_activities: user.favorite_activities });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Error adding favorite activity:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const removeFavoriteActivity = async (req, res) => {

  try {
    const { activity } = req.body;
    if (!activity) {
      return res.status(400).json({ message: 'Activity is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {

      return res.status(404).json({ message: 'User not found' });
    }

    const activityIndex = user.favorite_activities.indexOf(activity);
    if (activityIndex === -1) {
      return res.status(400).json({ message: 'Activity not found in favorites' });
    }

    user.favorite_activities.splice(activityIndex, 1);
    await user.save();

    res.json({ message: 'Activity removed from favorites', favorite_activities: user.favorite_activities });
  } catch (error) {
    console.error('Error removing favorite activity:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Remove profile picture
const removeProfilePicture = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (!user.profile_picture) {
      return res.status(400).json({ 
        success: false, 
        message: 'No profile picture to remove' 
      });
    }

    // Extract S3 key and delete from CDN
    const s3Key = extractS3KeyFromUrl(user.profile_picture);
    if (s3Key) {
      await deleteFromS3(s3Key);
      await invalidateCloudFront(s3Key);
    }

    // Update user record
    user.profile_picture = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture removed successfully'
    });

  } catch (error) {
    console.error('Error removing profile picture:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error removing profile picture' 
    });
  }
};

// Remove cover photo
const removeCoverPhoto = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (!user.cover_photo) {
      return res.status(400).json({ 
        success: false, 
        message: 'No cover photo to remove' 
      });
    }

    // Extract S3 key and delete from CDN
    const s3Key = extractS3KeyFromUrl(user.cover_photo);
    if (s3Key) {
      await deleteFromS3(s3Key);
      await invalidateCloudFront(s3Key);
    }

    // Update user record
    user.cover_photo = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Cover photo removed successfully'
    });

  } catch (error) {
    console.error('Error removing cover photo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error removing cover photo' 
    });
  }
};

// Get user's CDN images info
const getUserImages = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('profile_picture cover_photo');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: {
        profilePicture: user.profile_picture,
        coverPhoto: user.cover_photo
      }
    });

  } catch (error) {
    console.error('Error getting user images:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting user images' 
    });
  }
};

// Generate default profile picture using PNG
const generateDefaultProfilePicture = async (req, res) => {
  try {
    const { initials, backgroundColor } = req.body;
    
    if (!initials || !backgroundColor) {
      return res.status(400).json({
        success: false,
        message: 'Initials and background color are required'
      });
    }

    const size = 400;
    const fontSize = Math.floor(size * 0.35);
    
    // Create SVG string with precise text centering
    // Calculate text position to ensure perfect centering
    const centerX = size / 2;
    const centerY = size / 2;
    // Adjust Y position slightly for better visual centering (accounts for font metrics)
    const textY = centerY + (fontSize * 0.1); // Small upward adjustment
    
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${centerX}" cy="${centerY}" r="${size / 2}" fill="${backgroundColor}" />
        <text x="${centerX}" y="${centerY}" 
              font-family="Arial, Helvetica, sans-serif" 
              font-size="${fontSize}" 
              font-weight="bold" 
              fill="white" 
              text-anchor="middle" 
              dy=".35em">${initials}</text>
      </svg>
    `.trim();
    
    // Convert SVG to PNG using Sharp
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
    
    // Convert PNG buffer to base64 data URI
    const dataUri = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    
    res.status(200).json({
      success: true,
      dataUri: dataUri,
      message: 'Profile picture generated successfully'
    });

  } catch (error) {
    console.error('Error generating profile picture:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate profile picture'
    });
  }
};

const bypassTwoFactorAuth = async (req, res) => {
  const email = req.body.email;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.bypass_two_factor_auth = true;
    await user.save();

    res.status(200).json({ message: 'Two-factor authentication bypassed successfully' });
  } catch (error) {
    console.error('Error bypassing two-factor authentication:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

const getBypassTwoFactorAuth = async (req, res) => {
  const email = req.query.email;
  try {
    const user = await User.findOne({ email });
    res.status(200).json({ bypass_two_factor_auth: user.bypass_two_factor_auth });
  } catch (error) {
    console.error('Error getting bypass two-factor authentication:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = { 
  getUserProfile,
  getUsers,
  deleteUsers,
  editMyProfile,
  createUser,
  findMe,
  getUser,
  getUserFriendByEmailSearch,
  getUserFriendByNameSearch,
  markStoriesViewed,
  requestAccountDeletion,
  cancelAccountDeletion,
  blockUser,
  unblockUser,
  getBlockedUsers,
  addActivityTag,
  removeActivityTag,
  addFriendsToTag,
  removeFriendsFromTag,
  getUserTags,
  getFavoriteActivities,
  addFavoriteActivity,
  removeFavoriteActivity,
  removeProfilePicture,
  removeCoverPhoto,
  getUserImages,
  generateDefaultProfilePicture,
  bypassTwoFactorAuth,
  getBypassTwoFactorAuth,
  createDefaultProfileImage  // Export the helper function
};
