import activeRoomsMap from "../config/activeRoomsMap.js";
import createRoom from "../rooms/createRoom.js";
import generateUniqueCode from "../rooms/generateUniqueCode.js";

export default function postRoom(req, res) {
  const code = generateUniqueCode(activeRoomsMap);

  createRoom(code, req.body.name);

  res.send({ code });
}
