import { Server } from "socket.io";

const io = new Server(4000);

io.on("connection", socket => {
  socket.on("setName", name => {
    console.log(`User set their name to ${name}`);
  });
});
