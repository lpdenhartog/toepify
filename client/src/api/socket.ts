import { io, Socket } from "socket.io-client";
import type { GameState } from "./game";

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (!socket) {
    socket = io({ path: "/socket.io" });
  }
  return socket;
}

export function joinGame(gameId: string) {
  connectSocket().emit("join_game", { gameId });
}

export function sendPenaltyUpdate(gameId: string, playerId: string, penalty: number) {
  connectSocket().emit("round_penalty_update", { gameId, playerId, penalty });
}

export function onGameState(callback: (state: GameState) => void) {
  connectSocket().on("game_state", callback);
}

export function onPenaltyUpdated(callback: (data: { playerId: string; penalty: number }) => void) {
  connectSocket().on("round_penalty_updated", callback);
}

export function onNewGameStarted(callback: (data: { gameId: string; tournamentId: string }) => void) {
  connectSocket().on("new_game_started", callback);
}

export function leaveGame(_gameId: string) {
  const s = connectSocket();
  s.off("game_state");
  s.off("round_penalty_updated");
  s.off("new_game_started");
  // Socket.IO rooms are server-side; just remove listeners
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
