import _ from "lodash";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import userQuery from "../utils/helper/dbHelper.js";
import crypto from "crypto";

const signup = async (req, res) => {
  const userData = req.body;
  
  if (_.isEmpty(userData)) {
    return res.status(400).json({ message: "No data received" });
  }

  const {
    name,
    username,
    email,
    password,
    countries_id, // Maps to `countries_id` in the table
    avatar,
    cover,
    role,
    permission,
  } = userData;

  // Validate required fields
  if (!name || !username || !email || !password || !countries_id) {
    return res.status(400).json({ message: "Required fields are missing" });
  }

  // Validate role and permission values
  const validRoles = ["normal", "admin", "moderator", "editor", "developer"];
  const validPermissions = ["all", "none"];

  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role value" });
  }

  if (permission && !validPermissions.includes(permission)) {
    return res.status(400).json({ message: "Invalid permission value" });
  }

  try {
    // Check if email or username already exists
    const existingUser = await userQuery(
      `SELECT * FROM users WHERE email = ? OR username = ?`,
      [email, username]
    );

    if (existingUser.length > 0) {
      return res
        .status(400)
        .json({ message: "Email or username already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user details into the database
    const result = await userQuery(
      `
      INSERT INTO users 
        (name, email, username, password, countries_id, avatar, cover, status, role, permission, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW())
      `,
      [
        name,
        email,
        username,
        hashedPassword,
        countries_id,
        avatar || null, // Optional fields default to null if not provided
        cover || null,
        role || "normal", // Default to "normal" if not provided
        permission || "none", // Default to "none" if not provided
      ]
    );
    
    // Extract the insertId
    const userId = result.insertId;

    // Generate a JWT token
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Set the JWT token as a session cookie
    req.session.token = token;
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000, // 1 hour
    });

    res.status(200).json({
      message: "SignUp successful",
      user: { id: userId, email: userData.email, username: userData.username, token: token, avatar: userData.avatar },
    });

  } catch (err) {
    console.error("Error during signup:", err);
    res.status(500).json({ message: "Error while signing up" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Fetch user details from the database
    const userResult = await userQuery(`SELECT * FROM users WHERE email = ?`, [email]);

    // Check if the user exists
    if (_.isEmpty(userResult)) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userResult[0];

    // Check if the account status is active
    if (user.status !== "active") {
      return res.status(403).json({ message: "Account is not active" });
    }

    // Compare the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Generate a JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Set the JWT token as a session cookie
    req.session.token = token;
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000, // 1 hour
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ message: "Error while logging in" });
  }
};

export const getAllUsersProfile = async (req, res) => {
  try {
    // Assuming the user's ID is stored in the JWT token and can be accessed from the request's `user` object.
    const loggedInUserId = req.user.userId; // You may need to adjust this based on your authentication middleware

    // Base query excluding the logged-in user
    let query = `SELECT id, name, username, avatar, role, status 
                 FROM users 
                 WHERE id != ?`;  // Exclude the logged-in user from the query

    const rows = await userQuery(query, [loggedInUserId]);  // Pass the logged-in user ID as a parameter

    res.status(200).json({ success: true, users: [rows] });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
}



export default {
  signup,
  login,
  getAllUsersProfile
};
