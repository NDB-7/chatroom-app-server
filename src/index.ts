import { Server } from "socket.io";
import express from "express";
import http from "http";
import cors from "cors";
import { z } from "zod";
import { ActiveRoomType, ServerMessageType } from "./types.js";

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

const activeRoomsMap = new Map<string, ActiveRoomType>();
// REMOVE LATER
createRoom("test", "Testing Room");

app.get("/rooms/:code", (req, res) => {
  const room = activeRoomsMap.get(req.params.code);

  if (room) {
    res.send({
      success: true,
      name: room.data.name,
      expiresAt: room.data.expiresAt,
    });
  } else {
    res.status(404).send({ success: false });
  }
});

app.post("/rooms", (req, res) => {
  const code = generateUniqueCode();

  createRoom(code, req.body.name);

  res.send(code);
});

// SWAP SESSIONS WITH JWTS THAT CONTAIN ROOM CODE AND SESSION ID
const nameSchema = z.string().min(1).max(20);
const messageSchema = z.string().min(1).max(1000);

io.on("connection", socket => {
  const id = socket.id;
  console.log(`User ${id} connected`);

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

  socket.on("setName", (name: string, room: string, callback) => {
    const { success, data } = nameSchema.safeParse(name.trim());
    const { sessionToUsersMap, activeSessionsMap, allUsersSet, messagesCache } =
      activeRoomsMap.get(room);

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
        callback({ success: true, session: { room, id: sessionId } });
        sessionToUsersMap.set(sessionId, data);
        activeSessionsMap.set(id, sessionId);
        allUsersSet.add(data);
        socket.join(room);
        messagesCache.forEach(msg => socket.emit("receiveMessage", msg));
        updateUserListForClients(room);
        const message: ServerMessageType = {
          content: `${data} joined the chatroom.`,
          serverNotification: true,
        };
        io.to(room).emit("receiveMessage", message);
      }
    }
  });

  socket.on("sendMessage", (messageText: string, session) => {
    if (session) {
      const { sessionToUsersMap, messagesCache } = activeRoomsMap.get(
        session.room
      );
      if (sessionToUsersMap.has(session.id)) {
        const { success, data } = messageSchema.safeParse(messageText.trim());
        if (success) {
          const name = sessionToUsersMap.get(session.id);
          console.log(`User ${id} (${name}) said ${data}`);
          const message: ServerMessageType = {
            sender: name,
            content: data,
            serverNotification: false,
            sentAt: Date.now(),
          };
          io.to(session.room).emit("receiveMessage", message);
          message.cache = true;
          messagesCache.push(message);
          if (messagesCache.length > 10) messagesCache.shift();
        }
      }
    }
  });

  socket.on("disconnect", () => {
    let code: string;

    activeRoomsMap.forEach((room, roomCode) => {
      if (room.activeSessionsMap.has(id)) {
        code = roomCode;
      }
    });

    if (code) {
      const { sessionToUsersMap, activeSessionsMap } = activeRoomsMap.get(code);

      const sessionId = activeSessionsMap.get(id);
      const name = sessionToUsersMap.get(sessionId);
      console.log(`User ${id} (${name}) disconnected.`);
      activeSessionsMap.delete(id);
      updateUserListForClients(code);
      const message: ServerMessageType = {
        content: `${name} left the chatroom.`,
        serverNotification: true,
      };
      io.to(code).emit("receiveMessage", message);
    } else console.log(`User ${id} disconnected.`);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

function updateUserListForClients(room: string) {
  const onlineUserList: string[] = [];
  const offlineUserList: string[] = [];

  const { sessionToUsersMap, allUsersSet, activeSessionsMap } =
    activeRoomsMap.get(room);

  sessionToUsersMap.forEach((name, sessionId) => {
    if (new Set(activeSessionsMap.values()).has(sessionId))
      onlineUserList.push(name);
  });

  allUsersSet.forEach(name => {
    if (!onlineUserList.includes(name)) offlineUserList.push(name);
  });

  io.to(room).emit("updateUserList", onlineUserList, offlineUserList);
}

function generateUniqueCode() {
  let code = "";
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const length = 4;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    code += alphabet[randomIndex];
  }

  if (activeRoomsMap.has(code)) return generateUniqueCode();
  return code;
}

function roomCleanup() {
  activeRoomsMap.forEach((room, code) => {
    const {
      allUsersSet,
      data: { createdAt, expiresAt },
    } = room;
    const now = Date.now();
    // Clear unused rooms after 10 minutes
    if (now - createdAt > 600000 && allUsersSet.size === 0) {
      activeRoomsMap.delete(code);
      console.log(`Deleted unused room (${code})`);
    }
    // Clear expired rooms
    else if (expiresAt - now <= 0) {
      io.to(code).emit("roomExpired");
      activeRoomsMap.delete(code);
      console.log(`Deleted expired room (${code})`);
    }
  });
}

function createRoom(code: string, name: string) {
  activeRoomsMap.set(code, {
    data: {
      name,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    },
    sessionToUsersMap: new Map<string, string>(),
    activeSessionsMap: new Map<string, string>(),
    allUsersSet: new Set<string>(),
    messagesCache: [],
  });
}

function emitMessage(message: ServerMessageType) {}

setInterval(roomCleanup, 5000);
