// const passport = require('passport');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const User = require('../database/schemas/usersSchema');
// const logger = require('winston'); // Optional logger for better logging
// require('dotenv').config();

// passport.use(new GoogleStrategy({
//     clientID: process.env.GOOGLE_CLIENT_ID,
//     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//     callbackURL: process.env.GOOGLE_CALLBACK_URL,
//   },
//   async (accessToken, refreshToken, profile, done) => {
//     try {
//       logger.info(`Google profile received: ${profile.id}`);
//       let user = await User.findOne({ google_id: profile.id });

//       if (!user) {
//         logger.info(`Creating new user for Google ID: ${profile.id}`);
//         user = await User.create({
//           first_name: profile.name?.givenName || 'FirstName',
//           last_name: profile.name?.familyName || 'LastName',
//           username: profile.emails?.[0]?.value || `google_${profile.id}`,
//           email: profile.emails?.[0]?.value || `google_${profile.id}@example.com`,
//           role: 'member',
//           google_id: profile.id,
//           profile_picture: profile.photos?.[0]?.value || null,
//         });
//       }

//       return done(null, user);
//     } catch (err) {
//       logger.error('Error during Google OAuth:', err);
//       return done(err, false, { message: 'Error during Google OAuth' });
//     }
//   }
// ));

// passport.serializeUser((user, done) => {
//   done(null, user.id);
// });

// passport.deserializeUser(async (id, done) => {
//   try {
//     const user = await User.findById(id);
//     done(null, user);
//   } catch (err) {
//     logger.error('Error deserializing user:', err);
//     done(err, false);
//   }
// });