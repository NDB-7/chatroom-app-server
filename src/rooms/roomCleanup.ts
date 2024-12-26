import { io } from "../config/server.js";
import activeRoomsMap from "../config/activeRoomsMap.js";

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

setInterval(roomCleanup, 5000);
