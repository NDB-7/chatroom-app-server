"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var socket_io_1 = require("socket.io");
var io = new socket_io_1.Server(4000);
io.on("connection", function (socket) {
    socket.on("setName", function (name) {
        console.log("User set their name to ".concat(name));
    });
});
