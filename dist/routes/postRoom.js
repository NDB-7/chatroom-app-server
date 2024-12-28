import activeRoomsMap from "../config/activeRoomsMap.js";
import createRoom from "../rooms/createRoom.js";
import generateUniqueCode from "../rooms/generateUniqueCode.js";
import { z } from "zod";
const roomNameSchema = z.string().min(1).max(30);
export default function postRoom(req, res) {
    const { success, data, error } = roomNameSchema.safeParse(req.body.name);
    if (success) {
        const code = generateUniqueCode(activeRoomsMap);
        createRoom(code, data);
        res.send({ success: true, code });
    }
    else
        res.send({ success: false });
}
//# sourceMappingURL=postRoom.js.map