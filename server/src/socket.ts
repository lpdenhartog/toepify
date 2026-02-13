import type { Server } from "socket.io";

export function setupSocket(io: Server) {
  io.on("connection", (socket) => {
    socket.on("join_game", ({ gameId }: { gameId: string }) => {
      socket.join(`game:${gameId}`);
    });

    socket.on(
      "round_penalty_update",
      ({ gameId, playerId, penalty }: { gameId: string; playerId: string; penalty: number }) => {
        // Relay optimistic penalty to other clients in the room
        socket.to(`game:${gameId}`).emit("round_penalty_updated", {
          playerId,
          penalty,
        });
      }
    );
  });
}
