import activeRoomsMap from "../config/activeRoomsMap.js";
export default function getRooms(req, res) {
    const room = activeRoomsMap.get(req.params.code);
    if (room) {
        res.send({
            success: true,
            name: room.data.name,
            expiresAt: room.data.expiresAt,
        });
    }
    else {
        res.status(404).send({ success: false });
    }
}
//# sourceMappingURL=getRooms.js.map