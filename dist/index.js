"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var socket_io_1 = require("socket.io");
var express = require("express");
var http = require("http");
var cors = require("cors");
var app = express();
var server = http.createServer(app);
var io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
    },
    connectionStateRecovery: {},
});
app.use(express.json());
app.use(cors({ origin: "*" }));
// Dummy data for now. Later, it'll search the database for an active chatroom
app.get("/rooms/:code", function (req, res) {
    res.send({ success: true, name: "Testing Room", expiresAt: 999999 });
});
// Temporary map, will be replaced with database. HOLDS ONLINE USERS
var onlineUsersMap = new Map();
// Temporary set, will be replaced with database. HOLDS ALL USERS
var allUsersSet = new Set();
// VALIDATE WITH ZOD LATER
io.on("connection", function (socket) {
    var id = socket.id;
    console.log("User ".concat(id, " connected"));
    socket.on("setName", function (name, callback) {
        var trimmedName = name.trim();
        if (allUsersSet.has(trimmedName) || trimmedName === "You") {
            console.log("User ".concat(id, " attempted to set their name to ").concat(trimmedName));
            callback({
                success: false,
                message: "This name has already been used, try another one.",
            });
        }
        else {
            console.log("User ".concat(id, " set their name to ").concat(trimmedName));
            callback({ success: true });
            onlineUsersMap.set(id, trimmedName);
            allUsersSet.add(trimmedName);
            updateUserListForClients();
        }
    });
    socket.on("sendMessage", function (message) {
        if (onlineUsersMap.has(id)) {
            var name_1 = onlineUsersMap.get(id);
            console.log("User ".concat(id, " (").concat(name_1, ") said ").concat(message));
            io.emit("receiveMessage", name_1, message);
        }
    });
    socket.on("disconnect", function () {
        if (onlineUsersMap.has(id)) {
            var name_2 = onlineUsersMap.get(id);
            console.log("User ".concat(id, " (").concat(name_2, ") disconnected."));
            onlineUsersMap.delete(id);
            updateUserListForClients();
        }
        else
            console.log("User ".concat(id, " disconnected."));
    });
});
server.listen(4444, function () { return console.log("Server running on port 4444"); });
function updateUserListForClients() {
    var onlineUserList = [];
    var offlineUserList = [];
    // Only online users are stored in onlineUsersMap!
    onlineUsersMap.forEach(function (name) {
        onlineUserList.push(name);
    });
    allUsersSet.forEach(function (name) {
        if (!onlineUserList.includes(name))
            offlineUserList.push(name);
    });
    io.emit("updateUserList", onlineUserList, offlineUserList);
    console.log(onlineUserList, offlineUserList);
}
