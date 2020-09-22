import StockfishWorker from "./stockfish/StockfishWorker";

/**
 * Game subscribes to gameId events and handles them posting moves
 * generated by player object that must implement two methods:
 * 
 * getNextMove(array of uciMoves) returns uciMove
 * getReply(chat event) returns chat message  
 * 
 */
class Game {

  /**
   * Initialise with interface to lichess.
   */
  constructor(api, name, player, engine) {
    this.api = api;
    this.name = name;
    this.player = player;
    this.engine = new StockfishWorker();
  }

  start(gameId) {
    this.gameId = gameId;
    this.api.streamGame(gameId, (event) => this.handler(event));
    this.engine.start();
  }

  handleChatLine(event) {
    if (event.username !== this.name) {
      const reply = this.player.getReply(event);
      if (reply) {
        this.api.chat(this.gameId, event.room, reply);
      }
    }
  }

  handler(event) {
    switch (event.type) {
      case "chatLine":
        this.handleChatLine(event);
        break;
      case "gameFull":
        this.colour = this.playingAs(event);
        this.playNextMove(event.state.moves, [event.wtime, event.btime], [event.winc, event.binc]);
        break;
      case "gameState":
        this.playNextMove(event.moves, [event.wtime, event.btime], [event.winc, event.binc]);
        break;
      default:
        console.log("Unhandled game event : " + JSON.stringify(event));
    }
  }

  async playNextMove(previousMoves, times, incs) {
    const moves = (previousMoves === "") ? [] : previousMoves.split(" ");
    if (this.isTurn(this.colour, moves)) {
      const nextMove = await this.player.getNextMove(moves, this.engine, times, incs);
      if (nextMove) {
        console.log(this.name + " as " + this.colour + " to move " + nextMove);
        this.api.makeMove(this.gameId, nextMove);
      }
    }
  }

  playingAs(event) {
    return (event.white.name === this.name) ? "white" : "black";
  }

  isTurn(colour, moves) {
    var parity = moves.length % 2;
    return (colour === "white") ? (parity === 0) : (parity === 1);
  }
}

export default Game;
