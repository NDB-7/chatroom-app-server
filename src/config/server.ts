import { Server } from "socket.io";
import express from "express";
import http from "http";
import cors from "cors";

const PORT = process.env.PORT || 4444;

export const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "*",
  },
  connectionStateRecovery: {},
});

app.use(express.json());
app.use(cors({ origin: "*" }));

export default function startServer() {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
