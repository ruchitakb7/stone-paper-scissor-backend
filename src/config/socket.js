import {
  handleJoinGame,
  handleSubmitChoice,
} from "../controller/gameController.js";

const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    socket.on("join_game", async (data) => {
      await handleJoinGame(socket, io, data);
    });

    socket.on("submit_choice", async (data) => {
      await handleSubmitChoice(socket, io, data);
    });

    socket.on("disconnect", () => {
      console.log("Player disconnected:", socket.id);
    });
  });
};

export default initializeSocket;