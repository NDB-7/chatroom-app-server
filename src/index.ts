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

const activeRoomsMap = new Map([["test", {
  // Dummy data. Later, a TS type will be defined
  data: { name: "Testing Room", expiresAt: Date.now() + 3600000 },
  onlineUsersMap: new Map<string, string>(),
  sessionsMap: new Map<string, string>(),
  allUsersSet: new Set<string>(),
}]]);

app.get("/rooms/:code", (req, res) => {
  const room = activeRoomsMap.get(req.params.code);

  if (room) {
    res.send({ success: true, ...room.data });
  }
});

// SWAP SESSIONS WITH JWTS THAT CONTAIN ROOM CODE AND SESSION ID
// REPLACE SESSIONID WITH SESSION OBJECT CONTAINING ID AND CODE
const nameSchema = z.string().min(1).max(20);
const messageSchema = z.string().min(1).max(1000);

io.on("connection", socket => {
  const id = socket.id;
  const testRoom = activeRoomsMap.get("test")
  const { onlineUsersMap, sessionsMap, allUsersSet } = testRoom
  console.log(`User ${id} connected`);
  socket.join("test")

  socket.on("rejoin", (session, callback) => {
    if (onlineUsersMap.has(session.id)) {
      if (new Set(sessionsMap.values()).has(session.id))
        callback({
          success: false,
          message:
            "You already have an active session in this browser, please close it before attempting to open the chatroom again.",
        });
      else {
        sessionsMap.set(id, session.id);
        updateUserListForClients("test");
        callback({
          success: true,
          name: onlineUsersMap.get(session.id),
        });
        io.to("test").emit(
          "receiveMessage",
          undefined,
          `${onlineUsersMap.get(session.id)} rejoined the chatroom.`,
          true
        );
      }
    } else {
      callback({ success: false });
    }
  });

  socket.on("setName", (name: string, callback) => {
    const { success, data } = nameSchema.safeParse(name.trim());
    if (success) {
      if (allUsersSet.has(data) || data === "You") {
        console.log(`User ${id} attempted to set their name to ${data}`);
        callback({
          success: false,
          message: "This name has already been used, try another one.",
        });
      } else {
        console.log(`User ${id} set their name to ${data}`);
        const sessionId = crypto.randomUUID();
        callback({ success: true, session: { room: "test", id: sessionId } });
        onlineUsersMap.set(sessionId, data);
        sessionsMap.set(id, sessionId);
        allUsersSet.add(data);
        updateUserListForClients("test");
        io.to("test").emit(
          "receiveMessage",
          undefined,
          `${data} joined the chatroom.`,
          true
        );
      }
    }
  });

  socket.on("sendMessage", (message: string, session) => {
    if (onlineUsersMap.has(session.id)) {
      const { success, data } = messageSchema.safeParse(message.trim());
      if (success) {
        const name = onlineUsersMap.get(session.id);
        console.log(`User ${id} (${name}) said ${data}`);
        io.to("test").emit("receiveMessage", name, data, false);
      }
    }
  });

  socket.on("disconnect", () => {
    if (sessionsMap.has(id)) {
      const sessionId = sessionsMap.get(id);
      const name = onlineUsersMap.get(sessionId);
      console.log(`User ${id} (${name}) disconnected.`);
      sessionsMap.delete(id);
      updateUserListForClients("test");
      io.to("test").emit("receiveMessage", undefined, `${name} left the chatroom.`, true);
    } else console.log(`User ${id} disconnected.`);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

function updateUserListForClients(room: string) {
  const onlineUserList: string[] = [];
  const offlineUserList: string[] = [];

  const { onlineUsersMap, allUsersSet, sessionsMap } = activeRoomsMap.get(room);

  // Only online users are stored in onlineUsersMap!
  onlineUsersMap.forEach((name, sessionId) => {
    if (new Set(sessionsMap.values()).has(sessionId)) onlineUserList.push(name);
  });

  allUsersSet.forEach(name => {
    if (!onlineUserList.includes(name)) offlineUserList.push(name);
  });

  io.to(room).emit("updateUserList", onlineUserList, offlineUserList);
}
