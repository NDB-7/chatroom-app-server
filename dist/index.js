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
const activeRoomsMap = new Map([
    [
        "test",
        {
            // Dummy data. Later, a TS type will be defined
            data: { name: "Testing Room", expiresAt: Date.now() + 3600000 },
            onlineUsersMap: new Map(),
            sessionsMap: new Map(),
            allUsersSet: new Set(),
        },
    ],
]);
app.get("/rooms/:code", (req, res) => {
    const room = activeRoomsMap.get(req.params.code);
    if (room) {
        res.send({ success: true, ...room.data });
    }
});
// SWAP SESSIONS WITH JWTS THAT CONTAIN ROOM CODE AND SESSION ID
const nameSchema = z.string().min(1).max(20);
const messageSchema = z.string().min(1).max(1000);
io.on("connection", socket => {
    const id = socket.id;
    console.log(`User ${id} connected`);
    socket.on("rejoin", (session, callback) => {
        const { onlineUsersMap, sessionsMap } = activeRoomsMap.get(session.room);
        if (onlineUsersMap.has(session.id)) {
            if (new Set(sessionsMap.values()).has(session.id))
                callback({
                    success: false,
                    message: "You already have an active session in this browser, please close it before attempting to open the chatroom again.",
                });
            else {
                sessionsMap.set(id, session.id);
                socket.join(session.room);
                updateUserListForClients(session.room);
                callback({
                    success: true,
                    name: onlineUsersMap.get(session.id),
                });
                io.to(session.room).emit("receiveMessage", undefined, `${onlineUsersMap.get(session.id)} rejoined the chatroom.`, true);
            }
        }
        else {
            callback({ success: false });
        }
    });
    socket.on("setName", (name, room, callback) => {
        const { success, data } = nameSchema.safeParse(name.trim());
        const { onlineUsersMap, sessionsMap, allUsersSet } = activeRoomsMap.get(room);
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
                callback({ success: true, session: { room: "test", id: sessionId } });
                onlineUsersMap.set(sessionId, data);
                sessionsMap.set(id, sessionId);
                allUsersSet.add(data);
                socket.join(room);
                updateUserListForClients(room);
                io.to(room).emit("receiveMessage", undefined, `${data} joined the chatroom.`, true);
            }
        }
    });
    socket.on("sendMessage", (message, session) => {
        if (session) {
            const { onlineUsersMap } = activeRoomsMap.get(session.room);
            if (onlineUsersMap.has(session.id)) {
                const { success, data } = messageSchema.safeParse(message.trim());
                if (success) {
                    const name = onlineUsersMap.get(session.id);
                    console.log(`User ${id} (${name}) said ${data}`);
                    io.to(session.room).emit("receiveMessage", name, data, false);
                }
            }
        }
    });
    socket.on("disconnect", () => {
        const { onlineUsersMap, sessionsMap } = activeRoomsMap.get("test");
        if (sessionsMap.has(id)) {
            const sessionId = sessionsMap.get(id);
            const name = onlineUsersMap.get(sessionId);
            console.log(`User ${id} (${name}) disconnected.`);
            sessionsMap.delete(id);
            updateUserListForClients("test");
            io.to("test").emit("receiveMessage", undefined, `${name} left the chatroom.`, true);
        }
        else
            console.log(`User ${id} disconnected.`);
    });
});
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
function updateUserListForClients(room) {
    const onlineUserList = [];
    const offlineUserList = [];
    const { onlineUsersMap, allUsersSet, sessionsMap } = activeRoomsMap.get(room);
    // Only online users are stored in onlineUsersMap!
    onlineUsersMap.forEach((name, sessionId) => {
        if (new Set(sessionsMap.values()).has(sessionId))
            onlineUserList.push(name);
    });
    allUsersSet.forEach(name => {
        if (!onlineUserList.includes(name))
            offlineUserList.push(name);
    });
    io.to(room).emit("updateUserList", onlineUserList, offlineUserList);
}
//# sourceMappingURL=index.js.map