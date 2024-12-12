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
});
app.use(express.json());
app.use(cors({ origin: "*" }));
// Dummy data for now. Later, it'll search the database for an active chatroom
app.get("/rooms/:code", function (req, res) {
    res.send({ success: true, name: "Testing Room", expiresAt: 999999 });
});
// Temporary map, will be replaced with database
var userMap = new Map();
io.on("connection", function (socket) {
    var id = socket.id;
    console.log("User ".concat(id, " connected"));
    socket.on("setName", function (name) {
        console.log("User ".concat(id, " set their name to ").concat(name));
        userMap.set(id, name);
    });
    socket.on("sendMessage", function (message) {
        if (userMap.has(id)) {
            var name_1 = userMap.get(id);
            console.log("".concat(name_1, " said ").concat(message));
            io.emit("receiveMessage", name_1, message);
        }
    });
});
server.listen(4444, function () { return console.log("Server running on port 4444"); });
