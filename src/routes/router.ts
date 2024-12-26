import { app } from "../config/server.js";
import getRooms from "./getRooms.js";
import postRoom from "./postRoom.js";

app.get("/rooms/:code", getRooms);

app.post("/rooms", postRoom);
