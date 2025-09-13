class OnlineUserService {
    constructor() {
        this.onlineUsers = {};
    }

    addUser(userId, socketId) {
        //this.onlineUsers[userId] = socketId;
        this.onlineUsers.hasOwnProperty(userId) ? this.onlineUsers[userId].push(socketId) : this.onlineUsers[userId] = [socketId]
    }

    removeUser(socketId) {
        for (const userId in this.onlineUsers) {
            const sockets = this.onlineUsers[userId];

            const index = sockets.indexOf(socketId);
            if (index !== -1) {
                // Remove that socket
                sockets.splice(index, 1);
                console.log(`Socket ${socketId} removed for user ${userId}`);

                // If no sockets left, remove user entirely
                if (sockets.length === 0) {
                    delete this.onlineUsers[userId];
                    console.log(`User ${userId} is now offline`);
                }

                return;
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
