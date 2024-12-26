import { Socket } from "socket.io";
import activeRoomsMap from "../../config/activeRoomsMap.js";
import updateUserListForClients from "../../rooms/updateUserListForClients.js";
import { io } from "../../config/server.js";
import { ServerMessageType } from "../../types.js";

export default function rejoinEvent(socket: Socket) {
  const id = socket.id;

  socket.on("rejoin", (session, callback) => {
    if (activeRoomsMap.has(session.room)) {
      const { sessionToUsersMap, activeSessionsMap, messagesCache } =
        activeRoomsMap.get(session.room);
      if (sessionToUsersMap.has(session.id)) {
        if (new Set(activeSessionsMap.values()).has(session.id))
          callback({
            success: false,
            expired: false,
            message:
              "You already have an active session in this browser, please close it before attempting to open the chatroom again.",
          });
        else {
          activeSessionsMap.set(id, session.id);
          socket.join(session.room);
          updateUserListForClients(session.room);
          callback({
            success: true,
            name: sessionToUsersMap.get(session.id),
          });
          messagesCache.forEach(msg => socket.emit("receiveMessage", msg));
          const message: ServerMessageType = {
            content: `${sessionToUsersMap.get(
              session.id
            )} rejoined the chatroom.`,
            serverNotification: true,
          };
          io.to(session.room).emit("receiveMessage", message);
        }
      } else {
        callback({ success: false });
      }
    } else {
      callback({
        success: false,
        expired: true,
        message: "This chatroom has expired.",
      });
    }
  });
}
