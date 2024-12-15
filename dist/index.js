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
app.use(express.json());
app.use(cors({ origin: "*" }));
// Dummy data for now. Later, it'll search the database for an active chatroom
app.get("/rooms/:code", (req, res) => {
    res.send({ success: true, name: "Testing Room", expiresAt: 999999 });
});
// Temporary map, will be replaced with database. HOLDS ONLINE USERS
const onlineUsersMap = new Map();
// Temporary set, will be replaced with database. HOLDS ALL USERS
const allUsersSet = new Set();
const nameSchema = z.string().min(1).max(20);
const messageSchema = z.string().min(1).max(1000);
// VALIDATE WITH ZOD LATER
io.on("connection", socket => {
    const id = socket.id;
    console.log(`User ${id} connected`);
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
                callback({ success: true });
                onlineUsersMap.set(id, data);
                allUsersSet.add(data);
                updateUserListForClients();
                io.emit("receiveMessage", undefined, `${data} joined the chatroom.`, true);
            }
        }
    });
    socket.on("sendMessage", (message) => {
        if (onlineUsersMap.has(id)) {
            const { success, data } = messageSchema.safeParse(message.trim());
            if (success) {
                const name = onlineUsersMap.get(id);
                console.log(`User ${id} (${name}) said ${data}`);
                io.emit("receiveMessage", name, data, false);
            }
        }
    });
    socket.on("disconnect", () => {
        if (onlineUsersMap.has(id)) {
            const name = onlineUsersMap.get(id);
            console.log(`User ${id} (${name}) disconnected.`);
            onlineUsersMap.delete(id);
            updateUserListForClients();
            io.emit("receiveMessage", undefined, `${name} left the chatroom.`, true);
        }
        else
            console.log(`User ${id} disconnected.`);
    });
});
server.listen(4444, () => console.log("Server running on port 4444"));
function updateUserListForClients() {
    const onlineUserList = [];
    const offlineUserList = [];
    // Only online users are stored in onlineUsersMap!
    onlineUsersMap.forEach(name => {
        onlineUserList.push(name);
    });
    allUsersSet.forEach(name => {
        if (!onlineUserList.includes(name))
            offlineUserList.push(name);
    });
    io.emit("updateUserList", onlineUserList, offlineUserList);
    console.log(onlineUserList, offlineUserList);
}
//# sourceMappingURL=index.js.map