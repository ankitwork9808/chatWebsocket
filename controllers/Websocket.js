import OnlineUserService from '../service/OnlineUserService.js';

const emitToClient = async (req, res) => {
    try {
        const { type, auth_user, conversation_id, emit_to, message } = req.query;

        const socketId = OnlineUserService.getSocketId(emit_to);

        if (socketId) {

            req.io.to(socketId).emit(type, {
                type,
                message,
                emit_to,
                auth_user
            });

            return res.status(200).json({
                success: true,
                message: "Emit successful!",
                data: { type, auth_user, conversation_id, emit_to }
            });
        } else {
            return res.status(404).json({
                success: false,
                message: `User ${emit_to} is not online.`,
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Emit failed!",
            error: error.message
        });
    }
};

export default {
    emitToClient
};
