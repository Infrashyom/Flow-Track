
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false }, // Hide password by default
  role: { type: String, required: true },
}, { timestamps: true });

// To prevent sending password to frontend
userSchema.methods.toJSON = function() {
    var obj = this.toObject();
    delete obj.password;
    delete obj.__v; // remove version key
    delete obj._id; // remove default mongo id
    return obj;
}


const User = mongoose.model('User', userSchema);
export default User;