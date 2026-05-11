import { io, Socket } from "socket.io-client";
import { API_BASE, getToken } from "./api";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socket = io(API_BASE, {
    transports: ["websocket"],
    auth: { token: getToken() },
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
