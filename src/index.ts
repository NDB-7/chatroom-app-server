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

// Temporary map, will be replaced with database
const userMap = new Map<string, string>();
// Temporary set, will be replaced with database
const userNameSet = new Set<string>(["You"]);

// VALIDATE WITH ZOD LATER
io.on("connection", socket => {
  const id = socket.id;
  console.log(`User ${id} connected`);
  socket.on("setName", (name: string, callback) => {
    const trimmedName = name.trim();
    if (userNameSet.has(trimmedName)) {
      console.log(`User ${id} attempted to set their name to ${trimmedName}`);
      callback({
        success: false,
        message: "This name has already been used, try another one.",
      });
    } else {
      console.log(`User ${id} set their name to ${trimmedName}`);
      callback({ success: true });
      userMap.set(id, trimmedName);
      userNameSet.add(trimmedName);
      socket.emit("userJoined", trimmedName);
    }
  });
  socket.on("sendMessage", message => {
    if (userMap.has(id)) {
      const name = userMap.get(id);
      console.log(`User ${id} (${name}) said ${message}`);
      io.emit("receiveMessage", name, message);
    }
  });
  socket.on("disconnect", () => {
    if (userMap.has(id)) {
      const name = userMap.get(id);
      console.log(`User ${id} (${name}) disconnected.`);
      userMap.delete(id);
    } else {
      console.log(`User ${id} disconnected.`);
    }
  });
});

server.listen(4444, () => console.log("Server running on port 4444"));
