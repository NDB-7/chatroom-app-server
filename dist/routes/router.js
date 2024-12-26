import express from "express";
import getRooms from "./getRooms.js";
import postRoom from "./postRoom.js";
const router = express.Router();
router.get("/rooms/:code", getRooms);
router.post("/rooms", postRoom);
export default router;
//# sourceMappingURL=router.js.map