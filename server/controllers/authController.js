
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1d', // Token expires in 1 day
    });
};

const MOCK_USERS_SEED_DATA = [
    { id: 'user-1', name: 'Sarah Chen', email: 'sarah.c@example.com', role: 'Sales', password: 'password123' },
    { id: 'user-2', name: 'John Doe', email: 'john.d@example.com', role: 'Team', password: 'password123' },
    { id: 'user-3', name: 'Peter Parker', email: 'p.parker@example.com', role: 'Digitizer', password: 'password123' },
    { id: 'user-4', name: 'Clark Kent', email: 'clark.k@example.com', role: 'Vendor', password: 'password123' },
    { id: 'user-5', name: 'Bruce Wayne', email: 'bruce.w@example.com', role: 'Admin', password: 'password123' },
    { id: 'user-6', name: 'Diana Prince', email: 'd.prince@example.com', role: 'Digitizer', password: 'password123' },
    { id: 'user-7', name: 'Barry Allen', email: 'b.allen@example.com', role: 'Vendor', password: 'password123' },
];

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }
        
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (user && await bcrypt.compare(password, user.password)) {
            res.status(200).json({ 
                message: "Login successful", 
                user: user.toJSON(),
                token: generateToken(user.id) 
            });
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server error during login", error: error.message });
    }
};

export const verifyToken = async (req, res) => {
    // The 'protect' middleware has already run and attached the user to the request.
    // If we reach this point, the token is valid.
    res.status(200).json({ user: req.user.toJSON() });
};


export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).json(users.map(u => u.toJSON()));
    } catch (error) {
        res.status(500).json({ message: "Error fetching users", error: error.message });
    }
};

export const addUser = async (req, res) => {
    try {
        const { name, email, role, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const id = `user-${Date.now()}`;
        
        const newUser = new User({ id, name, email: email.toLowerCase(), role, password: hashedPassword });
        await newUser.save();
        res.status(201).json(newUser.toJSON());
    } catch (error) {
         if (error.code === 11000) { // Handle duplicate email error
            return res.status(409).json({ message: "An account with this email already exists." });
        }
        res.status(500).json({ message: "Error adding user", error: error.message });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, password } = req.body;
        
        const userToUpdate = await User.findOne({ id }).select('+password');
        if (!userToUpdate) {
            return res.status(404).json({ message: "User not found" });
        }

        userToUpdate.name = name;
        userToUpdate.email = email.toLowerCase();
        userToUpdate.role = role;
        if (password) {
            userToUpdate.password = await bcrypt.hash(password, SALT_ROUNDS);
        }

        const updatedUser = await userToUpdate.save();
        res.status(200).json(updatedUser.toJSON());
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "An account with this email already exists." });
        }
        res.status(500).json({ message: "Error updating user", error: error.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedUser = await User.findOneAndDelete({ id });
        if (!deletedUser) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting user", error: error.message });
    }
};

// Utility to seed database with initial mock data
export const seedUsers = async (req, res) => {
    try {
        await User.deleteMany({}); // Clear existing users

        const usersWithHashedPasswords = await Promise.all(
            MOCK_USERS_SEED_DATA.map(async (user) => {
                const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
                return { ...user, password: hashedPassword };
            })
        );
        
        await User.insertMany(usersWithHashedPasswords);
        res.status(201).send('Users seeded successfully');
    } catch (error) {
        res.status(500).json({ message: "Error seeding users", error: error.message });
    }
}