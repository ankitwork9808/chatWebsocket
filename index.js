import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { dbConnection } from "./db/connection.js";
import jwt from "jsonwebtoken";
// Route imports
import userRoutes from "./routes/user.js";
import messageRoute from "./routes/Message.js";

// Socket controller imports
import messageController from "./controllers/message.js";

const app = express();
const port = process.env.PORT || 3000;

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://127.0.0.1:8000", // Frontend origin
        methods: ["GET", "POST"],
        credentials: true,
    },
});

// Establish DB connection
const con = dbConnection();

// Middleware
if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
}

app.use(
    cors({
        origin: "http://127.0.0.1:8000", // Frontend origin
        credentials: true, // Allow cookies
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("trust proxy", 1);
app.use(
    session({
        secret: process.env.SESSION_SECRET || "fallback-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            maxAge: 30 * 60 * 1000, // 30 minutes
        },
    })
);

// Routes
app.use("/api/user", userRoutes);
app.use("/api/user", messageRoute);

const onlineUsers = {};

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    socket.on('register', (username) => {
        onlineUsers[username] = socket.id;
        console.log(onlineUsers);
    });

    socket.on("sendTyping", (data) => {
        io.to(onlineUsers[data.user_id]).emit("receiveSendTyping", {});
    });

    socket.on("sendMessage", async (messageData) => {
        console.log("sendMessage", messageData)
        try {
            const { id_user, message, price } = messageData;
            
            io.to(onlineUsers[id_user]).emit("receiveMessage", {
                message,
                id_user,
                price
            });
        } catch (error) {
            console.error("Error sending message:", error);
            io.to(onlineUsers[senderId]).emit("messageSent", {
                success: false,
                message: "Failed to send message",
            });
        }
        
    });
    
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "An unexpected error occurred", error: err.message });
});

// Start server
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
