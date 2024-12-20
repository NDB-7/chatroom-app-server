import { Server } from "socket.io";
import express from "express";
import http from "http";
import cors from "cors";
import { z } from "zod";
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },
    connectionStateRecovery: {},
});
const PORT = process.env.PORT || 4444;
app.use(express.json());
app.use(cors({ origin: "*" }));
// Dummy data for now. Later, it'll search a map for an active chatroom
app.get("/rooms/:code", (_, res) => {
    res.send({ success: true, name: "Testing Room", expiresAt: 999999 });
});
const onlineUsersMap = new Map();
const sessionsMap = new Map();
const allUsersSet = new Set();
const nameSchema = z.string().min(1).max(20);
const messageSchema = z.string().min(1).max(1000);
io.on("connection", socket => {
    const id = socket.id;
    console.log(`User ${id} connected`);
    socket.on("rejoin", (sessionId, callback) => {
        if (onlineUsersMap.has(sessionId)) {
            if (new Set(sessionsMap.values()).has(sessionId))
                callback({
                    success: false,
                    message: "You already have an active session in this browser, please close it before attempting to open the chatroom again.",
                });
            else {
                sessionsMap.set(id, sessionId);
                updateUserListForClients();
                callback({
                    success: true,
                    name: onlineUsersMap.get(sessionId),
                });
                io.emit("receiveMessage", undefined, `${onlineUsersMap.get(sessionId)} rejoined the chatroom.`, true);
            }
        }
        else {
            callback({ success: false });
        }
    });
    socket.on("setName", (name, callback) => {
        const { success, data } = nameSchema.safeParse(name.trim());
        if (success) {
            if (allUsersSet.has(data) || data === "You") {
                console.log(`User ${id} attempted to set their name to ${data}`);
                callback({
                    success: false,
                    message: "This name has already been used, try another one.",
                });
            }
            else {
                console.log(`User ${id} set their name to ${data}`);
                const sessionId = crypto.randomUUID();
                callback({ success: true, sessionId });
                onlineUsersMap.set(sessionId, data);
                sessionsMap.set(id, sessionId);
                allUsersSet.add(data);
                updateUserListForClients();
                io.emit("receiveMessage", undefined, `${data} joined the chatroom.`, true);
            }
        }
    });
    socket.on("sendMessage", (message, sessionId) => {
        if (onlineUsersMap.has(sessionId)) {
            const { success, data } = messageSchema.safeParse(message.trim());
            if (success) {
                const name = onlineUsersMap.get(sessionId);
                console.log(`User ${id} (${name}) said ${data}`);
                io.emit("receiveMessage", name, data, false);
            }
        }
    });
    socket.on("disconnect", () => {
        if (sessionsMap.has(id)) {
            const sessionId = sessionsMap.get(id);
            const name = onlineUsersMap.get(sessionId);
            console.log(`User ${id} (${name}) disconnected.`);
            sessionsMap.delete(id);
            updateUserListForClients();
            io.emit("receiveMessage", undefined, `${name} left the chatroom.`, true);
        }
        else
            console.log(`User ${id} disconnected.`);
    });
});
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
function updateUserListForClients() {
    const onlineUserList = [];
    const offlineUserList = [];
    // Only online users are stored in onlineUsersMap!
    onlineUsersMap.forEach((name, sessionId) => {
        if (new Set(sessionsMap.values()).has(sessionId))
            onlineUserList.push(name);
    });
    allUsersSet.forEach(name => {
        if (!onlineUserList.includes(name))
            offlineUserList.push(name);
    });
    io.emit("updateUserList", onlineUserList, offlineUserList);
}
//# sourceMappingURL=index.js.map