import { z } from "zod";
import activeRoomsMap from "../../config/activeRoomsMap.js";
import updateUserListForClients from "../../rooms/updateUserListForClients.js";
import { io } from "../../index.js";
const nameSchema = z.string().min(1).max(20);
export default function nameEvent(socket) {
    const id = socket.id;
    socket.on("setName", (name, room, callback) => {
        const { success, data } = nameSchema.safeParse(name.trim());
        const { sessionToUsersMap, activeSessionsMap, allUsersSet, messagesCache } = activeRoomsMap.get(room);
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
                callback({ success: true, session: { room, id: sessionId } });
                sessionToUsersMap.set(sessionId, data);
                activeSessionsMap.set(id, sessionId);
                allUsersSet.add(data);
                socket.join(room);
                messagesCache.forEach(msg => socket.emit("receiveMessage", msg));
                updateUserListForClients(room);
                const message = {
                    content: `${data} joined the chatroom.`,
                    serverNotification: true,
                };
                io.to(room).emit("receiveMessage", message);
            }
        }
    });
}
//# sourceMappingURL=nameEvent.js.map