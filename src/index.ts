import { Server } from "socket.io";
import * as express from "express";
import * as http from "http";
import * as cors from "cors";

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
const onlineUsersMap = new Map<string, string>();
// Temporary set, will be replaced with database. HOLDS ALL USERS
const allUsersSet = new Set<string>();

// VALIDATE WITH ZOD LATER
io.on("connection", socket => {
  const id = socket.id;
  console.log(`User ${id} connected`);

  socket.on("setName", (name: string, callback) => {
    const trimmedName = name.trim();
    if (allUsersSet.has(trimmedName) || trimmedName === "You") {
      console.log(`User ${id} attempted to set their name to ${trimmedName}`);
      callback({
        success: false,
        message: "This name has already been used, try another one.",
      });
    } else {
      console.log(`User ${id} set their name to ${trimmedName}`);
      callback({ success: true });
      onlineUsersMap.set(id, trimmedName);
      allUsersSet.add(trimmedName);
      updateUserListForClients();
    }
  });

  socket.on("sendMessage", message => {
    if (onlineUsersMap.has(id)) {
      const name = onlineUsersMap.get(id);
      console.log(`User ${id} (${name}) said ${message}`);
      io.emit("receiveMessage", name, message);
    }
  });

  socket.on("disconnect", () => {
    if (onlineUsersMap.has(id)) {
      const name = onlineUsersMap.get(id);
      console.log(`User ${id} (${name}) disconnected.`);
      onlineUsersMap.delete(id);
      updateUserListForClients();
    } else console.log(`User ${id} disconnected.`);
  });
});

server.listen(4444, () => console.log("Server running on port 4444"));

function updateUserListForClients() {
  const onlineUserList: string[] = [];
  const offlineUserList: string[] = [];

  // Only online users are stored in onlineUsersMap!
  onlineUsersMap.forEach(name => {
    onlineUserList.push(name);
  });

  allUsersSet.forEach(name => {
    if (!onlineUserList.includes(name)) offlineUserList.push(name);
  });

  io.emit("updateUserList", onlineUserList, offlineUserList);
  console.log(onlineUserList, offlineUserList);
}
