/**
 * Seed script — promotes a user to admin by email.
 *
 * Usage:
 *   node scripts/seedAdmin.js <email>
 *   node scripts/seedAdmin.js admin@example.com
 *
 * This is the ONLY way to create an admin. There is no signup toggle or UI path.
 * Run it once, then keep the credentials private.
 */
import mongoose from "mongoose";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

const email = process.argv[2];

if (!email) {
  console.error("❌  Usage: node scripts/seedAdmin.js <email>");
  process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error("❌  MONGO_URI or MONGODB_URI not found in environment.");
  process.exit(1);
}

await mongoose.connect(MONGO_URI);

const user = await User.findOne({ email: email.toLowerCase().trim() });

if (!user) {
  console.error(`❌  No user found with email: ${email}`);
  await mongoose.disconnect();
  process.exit(1);
}

if (user.isAdmin) {
  console.log(`ℹ️   ${email} is already an admin. No changes made.`);
  await mongoose.disconnect();
  process.exit(0);
}

user.isAdmin = true;
user.role = "admin";
await user.save();

console.log(`✅  ${email} (${user._id}) has been promoted to admin.`);
console.log("   They will need to log in again for the role to take effect.");

await mongoose.disconnect();
process.exit(0);
