import rejoinEvent from "./listeners/connections/rejoinEvent.js";
import disconnectEvent from "./listeners/connections/disconnectEvent.js";
import nameEvent from "./listeners/chatroom/nameEvent.js";
import messageEvent from "./listeners/chatroom/messageEvent.js";
import startServer, { io } from "./config/server.js";
io.on("connection", socket => {
    const id = socket.id;
    console.log(`User ${id} connected`);
    rejoinEvent(socket);
    disconnectEvent(socket);
    nameEvent(socket);
    messageEvent(socket);
});
startServer();
//# sourceMappingURL=index.js.map