const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const Collection = require("../models/Collection.model");
const Category = require("../models/Category.model");
const { isAuthenticated } = require("../middleware/jwt.middleware");

router.get("/users", async (req, res, next) => {
  try {
    const users = await User.find();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
    next(error);
  }
});

// I've uncommented the route below because we're using usernames instead of IDs now.
// Leaving it in the code for now in case we still need any of it elsewhere.

// router.get("/users/:id", async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       res.status(400).json({ message: "Specified id is not valid" });
//       return;
//     }

//     const user = await User.findById(id)
//       .populate("collections")
//       .populate("categories");
//     console.log(user);

//     res.status(200).json(user);
//   } catch (error) {
//     res.status(500).json({ message: "Internal Server Error" });
//     next(error);
//   }
// });

// Request user profile
router.get("/users/:username", async (req, res, next) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username })
      .populate("collections")
      .populate("categories");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
    next(error);
  }
});

router.put("/users/:_id", async (req, res, next) => {
  try {
    const { _id } = req.params;
    const {
      email,
      password,
      username,
      imageUrl,
      headerImageUrl,
      userbio,
      pronouns,
      categories,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      res.status(400).json({ message: "Specified id is not valid" });
      return;
    }

    const categoryArray = await Category.find({
      category: { $in: categories },
    });

    const updateUser = await User.findByIdAndUpdate(
      _id,
      {
        email,
        password,
        username,
        imageUrl,
        headerImageUrl,
        userbio,
        pronouns,
        categories: categoryArray,
      },
      { new: true }
    );

    res.status(200).json(updateUser);
  } catch (error) {
    if (error.code === 11000) {
      res.status(500).json({
        message:
          "Username and email need to be unique. Either username or email is already used.",
      });
    } else {
      res.status(500).json({ message: "Internal Server Error" });
    }
    next(error);
  }
});

// Delete user account
router.delete("/users/:_id", async (req, res, next) => {
  try {
    const { _id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      res.status(400).json({ message: "Specified id is not valid" });
      return;
    }

    await User.findByIdAndDelete(_id);
    res.status(200).json({
      message: `User with ${_id} is removed successfully.`,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
    next(error);
  }
});

// Follow user

router.post("/:_userId/follow/:_followedUserId", async (req, res) => {
  try {
    // get the currently logged in user
    const user = await User.findById(req.params._userId);
    // set the user to be followed
    const followedUser = await User.findById(req.params._followedUserId);
    if (!followedUser) return res.status(404).send({ error: "User not found" });
    // add the followedUser id to the  user's following array
    user.following.push(followedUser._id);
    // add the user id to followedUser's followers array
    followedUser.followers.push(user._id);
    await Promise.all([user.save(), followedUser.save()]);
    res.send({ message: `You are now following ${followedUser.username}` });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Server error" });
  }
});

// Unfollow user
router.post("/:_userId/unfollow/:_followedUserId", async (req, res) => {
  try {
    // get the currently logged in user
    const user = await User.findById(req.params._userId);
    // set the user to be unfollowed
    const followedUser = await User.findById(req.params._followedUserId);
    if (!followedUser) return res.status(404).send({ error: "User not found" });
    // remove the followedUser id from user's following array
    user.following = user.following.filter(
      (followedUserId) =>
        followedUserId.toString() !== followedUser._id.toString()
    );
    // remove the user id from followedUser's followers array
    followedUser.followers = followedUser.followers.filter(
      (followerId) => followerId.toString() !== user._id.toString()
    );
    await Promise.all([user.save(), followedUser.save()]);
    res.send({ message: `You have unfollowed ${followedUser.username}` });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Server error" });
  }
});

module.exports = router;
