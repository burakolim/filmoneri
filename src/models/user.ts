import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

interface IUser {
  username: string;
  email: string;
  password: string;
  watchlist: number[];
  createdAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  watchlist: {
    type: [Number],
    default: [],
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Şifreyi hashleme
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', userSchema);