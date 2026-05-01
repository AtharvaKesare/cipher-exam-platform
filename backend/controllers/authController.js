import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const generateToken = (id) => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback_secret') {
    throw new Error('JWT_SECRET env variable must be securely set');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

export const registerUser = async (req, res) => {
  const { name, email, password, faceEmbedding } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Force role to student for safety
    const user = await User.create({ name, email, password: hashedPassword, role: 'student', faceEmbedding });
    res.status(201).json({
      _id: user._id, name: user.name, email: user.email, role: user.role, subjectSpecialty: user.subjectSpecialty, faceEmbedding: user.faceEmbedding, token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const upgradeToTeacher = async (req, res) => {
  const { inviteCode, subjectSpecialty } = req.body;
  try {
    if (inviteCode !== process.env.TEACHER_INVITE_CODE) {
      return res.status(401).json({ message: 'Invalid teacher invite code' });
    }

    if (!['Python', 'SQL', 'JavaScript'].includes(subjectSpecialty)) {
      return res.status(400).json({ message: 'Valid subject specialty is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.role = 'teacher';
    user.subjectSpecialty = subjectSpecialty;
    await user.save();

    res.json({ message: 'Successfully upgraded to teacher status', user: { id: user._id.toString(), role: user.role, name: user.name, email: user.email, subjectSpecialty: user.subjectSpecialty } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id, name: user.name, email: user.email, role: user.role, subjectSpecialty: user.subjectSpecialty, faceEmbedding: user.faceEmbedding, token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const loginFaceUser = async (req, res) => {
  const { email, faceEmbedding } = req.body;
  try {
    if (!faceEmbedding || faceEmbedding.length === 0) {
      return res.status(400).json({ message: 'Face data missing' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.faceEmbedding || user.faceEmbedding.length === 0) {
      return res.status(400).json({ message: 'User does not have a registered face' });
    }

    if (user.faceEmbedding.length !== faceEmbedding.length) {
      return res.status(400).json({ message: 'Invalid face embedding format' });
    }

    // Calculate Euclidean distance between stored and provided face embeddings
    let sum = 0;
    for (let i = 0; i < faceEmbedding.length; i++) {
        sum += Math.pow(faceEmbedding[i] - user.faceEmbedding[i], 2);
    }
    const distance = Math.sqrt(sum);
    
    console.log(`[Face Auth] User: ${email} | Distance: ${distance.toFixed(4)} | Threshold: 0.40`);

    // Strict threshold: 0.40 for face-api.js euclidean distance
    // Lower distance = better match. Same person typically scores 0.1-0.35
    // Different people typically score 0.5+
    // 0.55 was too lenient and allowed different faces through
    if (distance <= 0.40) {
      console.log(`[Face Auth] ✅ MATCH for ${email} (distance: ${distance.toFixed(4)})`);
      res.json({
        _id: user._id, name: user.name, email: user.email, role: user.role, subjectSpecialty: user.subjectSpecialty, faceEmbedding: user.faceEmbedding, token: generateToken(user._id)
      });
    } else {
      console.log(`[Face Auth] ❌ REJECTED for ${email} (distance: ${distance.toFixed(4)})`);
      res.status(401).json({ message: `Face verification failed. The face does not match the registered identity. (score: ${distance.toFixed(2)})` });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
