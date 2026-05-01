import { connectDB } from './config/db.js';
import User from './models/User.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function makeAdmin() {
  await connectDB();
  const email = process.argv[2];
  if (!email) {
    console.log("Usage: node make_admin.js <email>");
    process.exit(1);
  }
  
  const user = await User.findOneAndUpdate({ email }, { role: 'admin' }, { new: true });
  if (user) {
    console.log(`Successfully made ${email} an admin!`);
  } else {
    console.log(`User with email ${email} not found.`);
  }
  mongoose.disconnect();
}
makeAdmin();
