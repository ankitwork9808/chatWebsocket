import _ from "lodash";
import userQuery from "../utils/helper/dbHelper.js";


// Send Message API
const sendMessage = async (req, res) => {
    const from_user_id = req.user.userId;
    const { to_user_id, message, file, price, tip, tip_amount, format, size } = req.body;

    if (!from_user_id || !to_user_id || !message) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
        // 1. Find or create a conversation between the two users
        let conversationQuery = `SELECT id FROM conversations WHERE (user_1 = ? AND user_2 = ?) OR (user_1 = ? AND user_2 = ?)`;
        const conversations = await userQuery(conversationQuery, [from_user_id, to_user_id, to_user_id, from_user_id]);

        let conversationId;
        if (conversations.length > 0) {
            // Conversation exists, use it
            conversationId = conversations[0].id;
        } else {
            // No conversation exists, create a new one
            const newConversationQuery = `INSERT INTO conversations (user_1, user_2, last_msg_by, last_status, stop_paid_chat) 
                                          VALUES (?, ?, ?, 'new', '0')`;
            const conversationResult = await userQuery(newConversationQuery, [from_user_id, to_user_id, from_user_id]);
            conversationId = conversationResult.insertId;
        }

        // 2. Insert message into the messages table with conversation_id
        const query = `INSERT INTO messages (conversations_id, from_user_id, to_user_id, message, attach_file, price, tip, tip_amount, format, size, created_at) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

        const result = await userQuery(query, [
            conversationId, // Add conversation_id here
            from_user_id,
            to_user_id,
            message,
            file || null,    // optional file
            price || 0,      // optional price
            tip || 'no',     // default 'no' for tip
            tip_amount || 0, // default 0 for tip_amount
            format || null,  // optional format
            size || null     // optional size
        ]);
        console.log('result:', result);
        
        // 3. Update the conversation with the new message details
        const updateConversationQuery = `UPDATE conversations SET last_msg_by = ?, last_status = 'new' WHERE id = ?`;
        await userQuery(updateConversationQuery, [from_user_id, conversationId]);

        // 4. Return the response
        res.status(200).json({
            success: true,
            message: "Message sent successfully",
            messageId: result.insertId,
            conversationId
        });

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, message: "Failed to send message" });
    }
};


// Get Messages API
const getMessages = async (req, res) => {

    const { id: other_user_id } = req.params; // `id` is treated as the other user's ID
    const { page = 1, limit = 100 } = req.query; // Get pagination data from query params
    const logged_in_user_id = req.user.userId; // Logged-in user ID from auth middleware

    try {
        // Validate required fields
        if (!other_user_id) {
            return res.status(400).json({ success: false, message: "Missing required user ID" });
        }

        // Find the conversation ID based on the two user IDs
        const findConversationQuery = `SELECT id 
                                       FROM conversations 
                                       WHERE (user_1 = ? AND user_2 = ?) 
                                          OR (user_1 = ? AND user_2 = ?) 
                                       LIMIT 1`;
        const conversations = await userQuery(findConversationQuery, [
            logged_in_user_id,
            other_user_id,
            other_user_id,
            logged_in_user_id,
        ]);
        
        if (conversations.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No conversation found between the users",
            });
        }

        const conversation_id = conversations[0].id;

        // Calculate pagination offset
        const offset = (page - 1) * limit;

        // Fetch messages for the resolved conversation
        const query = `SELECT id, from_user_id, to_user_id, message, attach_file, price, tip, tip_amount, format, size, created_at 
                       FROM messages 
                       WHERE conversations_id = ? 
                       LIMIT ? OFFSET ?`;

        const messages = await userQuery(query, [conversation_id, parseInt(limit), parseInt(offset)]);

        // Fetch total count for pagination
        const countQuery = `SELECT COUNT(*) AS total FROM messages WHERE conversations_id = ?`;
        const [countResult] = await userQuery(countQuery, [conversation_id]);
        const totalMessages = countResult.total;

        // Return messages and pagination data
        res.status(200).json({
            success: true,
            messages,
            pagination: {
                total: totalMessages,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalMessages / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ success: false, message: "Failed to fetch messages" });
    }
};



export default {
    sendMessage,
    getMessages
};
