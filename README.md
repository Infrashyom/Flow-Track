# FlowTrack - Full-Stack Order Management System

This is a comprehensive, multi-role workflow management system for processing orders from sales to delivery. This platform provides dedicated portals for Sales, Team, Digitizer, Vendor, and Admin roles to streamline the entire order lifecycle.

## Project Structure

-   `/client`: Contains the complete frontend React application, powered by Vite.
-   `/server`: Contains the complete backend Node.js, Express, and MongoDB application.

## How to Run

### Prerequisites

-   [Node.js](https://nodejs.org/) (v16 or later)
-   [MongoDB](https://www.mongodb.com/try/download/community) account and a database connection string.
-   [Shopify](https://www.shopify.com/) account and a custom app with an Admin API access token (optional, for order syncing).
-   [Cloudinary](https://cloudinary.com/) account for file storage.

### 1. Setup Environment Variables

First, navigate to the `server` directory and create an environment file named `.env`.

```bash
cd server
touch .env
```

Now, open the newly created `.env` file and add your credentials. It should look like this:

```
# MongoDB Connection String
# Replace with your actual MongoDB connection string
MONGO_URI="mongodb+srv://<user>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority"

# Port for the server to run on
PORT=5001

# JWT Secret for Token-Based Authentication (REQUIRED)
# This should be a long, random string for security.
# You can generate one at https://www.grc.com/passwords.htm
JWT_SECRET="your_super_secret_and_long_random_string_here"

# Cloudinary Credentials for File Uploads (REQUIRED)
# Get these from your Cloudinary dashboard.
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Shopify Custom App Credentials (Optional)
# These are required for the Shopify order sync feature.
# 1. In your Shopify Admin, go to "Apps and sales channels" > "Develop apps".
# 2. Create a new custom app.
# 3. Under "Admin API integration", configure the required scopes (e.g., read_orders).
# 4. Install the app to your store and reveal the "Admin API access token".
SHOPIFY_API_PASSWORD="your_admin_api_access_token_here"
SHOPIFY_STORE_URL="your-store-name.myshopify.com"
```

### 2. Install All Dependencies

From the **root** directory of the project, run the following command. This will install dependencies for the root, server, and client all at once.

```bash
npm install
```

### 3. Run the Development Servers

In your first terminal, start both the frontend and backend servers from the **root** directory:

```bash
npm run dev
```

This command uses `concurrently` to launch two processes:
-   The backend API server on `http://localhost:5001`.
-   The frontend Vite development server on `http://localhost:5173`.

**Keep this terminal open.**

### 4. Seed the Database (One-Time Setup)

Now, open a **second, separate terminal window**. From the **root** directory, run the seed command. **Important:** The development server from the previous step must be running for this to work.

```bash
npm run seed
```

This will populate your database with initial sample users. You only need to do this once. After it's done, you can close this second terminal. After seeding, log in as a Team or Admin user to sync your orders from Shopify.

### 5. Access the Application

Open your web browser and navigate to the Vite development server URL:

**[http://localhost:5173](http://localhost:5173)**

The application should now be running with a fast, hot-reloading development experience.

### Default Login Credentials

You can use the following credentials to log into the different portals:

-   **Sales:** `sarah.c@example.com` / `password123`
-   **Team:** `john.d@example.com` / `password123`
-   **Digitizer:** `p.parker@example.com` / `password123`
-   **Vendor:** `clark.k@example.com` / `password123`
-   **Admin:** `bruce.w@example.com` / `password123`