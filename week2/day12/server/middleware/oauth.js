const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const User = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/v1/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const existingUser = await User.findOne({
          $or: [{ googleId: profile.id }, { email: profile.emails[0].value }],
        });

        if (existingUser) {
          if (!existingUser.googleId) {
            existingUser.googleId = profile.id;
            await existingUser.save();
          }
          return done(null, existingUser);
        }

        const newUser = new User({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          avatar: profile.photos[0].value,
          isActive: true,
          role: "user",
        });

        await newUser.save();
        done(null, newUser);
      } catch (error) {
        done(error, null);
      }
    },
  ),
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/api/v1/auth/facebook/callback",
      profileFields: ["id", "emails", "name", "picture"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const existingUser = await User.findOne({
          $or: [{ facebookId: profile.id }, { email: profile.emails[0].value }],
        });

        if (existingUser) {
          if (!existingUser.facebookId) {
            existingUser.facebookId = profile.id;
            await existingUser.save();
          }
          return done(null, existingUser);
        }

        const newUser = new User({
          facebookId: profile.id,
          name: `${profile.name.givenName} ${profile.name.familyName}`,
          email: profile.emails[0].value,
          avatar: profile.photos[0].value,
          isActive: true,
          role: "user",
        });

        await newUser.save();
        done(null, newUser);
      } catch (error) {
        done(error, null);
      }
    },
  ),
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "/api/v1/auth/github/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const existingUser = await User.findOne({
          $or: [{ githubId: profile.id }, { email: profile.emails[0].value }],
        });

        if (existingUser) {
          if (!existingUser.githubId) {
            existingUser.githubId = profile.id;
            await existingUser.save();
          }
          return done(null, existingUser);
        }

        const newUser = new User({
          githubId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          avatar: profile.photos[0].value,
          isActive: true,
          role: "user",
        });

        await newUser.save();
        done(null, newUser);
      } catch (error) {
        done(error, null);
      }
    },
  ),
);
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
