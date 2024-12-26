import rejoinEvent from "../listeners/connections/rejoinEvent.js";
import disconnectEvent from "../listeners/connections/disconnectEvent.js";
import nameEvent from "../listeners/chatroom/nameEvent.js";
import messageEvent from "../listeners/chatroom/messageEvent.js";
import { Server } from "socket.io";
import express from "express";
import http from "http";
import cors from "cors";
import router from "../routes/router.js";
const PORT = process.env.PORT || 4444;
export const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
    cors: {
        origin: "*",
    },
    connectionStateRecovery: {},
});
app.use(express.json());
app.use(cors({ origin: "*" }));
app.use("/", router);
io.on("connection", socket => {
    const id = socket.id;
    console.log(`User ${id} connected`);
    rejoinEvent(socket);
    disconnectEvent(socket);
    nameEvent(socket);
    messageEvent(socket);
});
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
//# sourceMappingURL=server.js.map