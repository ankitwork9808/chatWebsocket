import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { dbConnection } from "./db/connection.js";
import OnlineUserService from './service/OnlineUserService.js';

// Route import
import websocketRoute from './routes/websocket.js';

const app = express();
const port = process.env.PORT || 3000;

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL, // Frontend origin
        methods: ["GET", "POST"],
        credentials: true,
    },
});

// Establish DB connection
// const con = dbConnection();

// Middleware
if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
}

app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
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

// Websocket routes
app.use("/api/websocket", (req, res, next) => {
    req.io = io;
    next();
}, websocketRoute);

// Socket.IO handlers
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Register user
    socket.on('register', (username) => {
        OnlineUserService.addUser(username, socket.id);
        console.log("Online users:", OnlineUserService.onlineUsers);
    });

    // Typing event
    socket.on("send_typing", (data) => {
        const recipientSocketId = OnlineUserService.getSocketId(data.emit_to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit("receiving_typing", {});
        }
    });

    // Media event
    socket.on("send_media", (data) => {
        const recipientSocketId = OnlineUserService.getSocketId(data.emit_to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit("receiving_media", {...data});
        }
    });

    // Disconnect event
    socket.on("disconnect", () => {
        OnlineUserService.removeUser(socket.id);
        console.log(`User with socket ${socket.id} disconnected`);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "An unexpected error occurred", error: err.message });
});

// Start server
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
