class OnlineUserService {
    constructor() {
        this.onlineUsers = {};
    }

    addUser(userId, socketId) {
        this.onlineUsers[userId] = socketId;
    }

    removeUser(socketId) {
        for (const [userId, socket] of Object.entries(this.onlineUsers)) {
            if (socket === socketId) {
                delete this.onlineUsers[userId];
                break;
            }
        }
    }

    getSocketId(userId) {
        return this.onlineUsers[userId];
    }

    getAllUsers() {
        return this.onlineUsers;
    }
}

export default new OnlineUserService();
