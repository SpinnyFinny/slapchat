require("dotenv").config();

const ENV = process.env.ENV || "development";
const knexConfig = require("../db/.knex/knexfile.js");
const knex = require("knex")(knexConfig[ENV]);
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io").listen(server);
const uuidv4 = require("uuid/v4");

let connections = [];

// Set up the seed database
// TODO refactor into a require file.

let state = require("./seed.js");

server.listen(process.env.PORT || 3001);

console.log("/public", __dirname + "/public");
app.use(express.static("public"));

//Index HTML is for debugging
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

//Socket on connect
io.sockets.on("connection", socket => {
  connections.push(socket);
  console.log("Connected: %s sockets connected", connections.length);
  io.sockets.emit("state", state.seed);

  //Disconnect
  socket.on("disconnect", data => {
    connections.splice(connections.indexOf(socket), 1);
    console.log("Disconnected %s sockets connnected", connections.length);
  });

  //Get Users
  socket.on("users.get", user => {
    knex
      .select()
      .from("users")
      .then(users => {
        socket.emit("users", users);
      });
  });

  // Get Channels
  socket.on("channels.get", channel => {
    knex
      .select()
      .from("channels")
      .then(channels => {
        socket.emit("channels", channels);
      });
  });

  //Get Direct_Messages
  socket.on("direct_messages.get", direct_message => {
    knex("direct_messages")
      .join("users", "direct_messages.sender_user_id", "=", "users.id")
      .select(
        "direct_messages.sender_user_id",
        "direct_messages.recipient_user_id",
        "direct_messages.content",
        "users.id",
        "users.first_name",
        "users.last_name",
        "users.display_name",
        "users.email",
        "users.avatar"
      )
      .then(direct_messages => {
        socket.emit("direct_messages", direct_messages);
      });
  });
  //Get Layers
  socket.on("layers.get", layer => {
    knex
      .select()
      .from("layers")
      .then(layers => {
        console.log("LAYERS", layers);
        socket.emit("layers", layers);
      });
  });

  //Get Markers
  socket.on("markers.get", marker => {
    knex
      .select()
      .from("markers")
      .then(markers => {
        console.log("MARKERS", markers);
        socket.emit("markers", markers);
      });
  });
  //Post Direct_Messages
  socket.on("direct_message.post", direct_message => {
    knex
      .insert(direct_message)
      .into("direct_messages")
      .returning("id")
      .then(id => {
        direct_message.id = id;
        io.sockets.emit("direct_message.post", direct_message);
      });
  });

  //Post Channel_Message
  socket.on("channel_message.post", channel_message => {
    knex
      .insert(channel_message)
      .into("channel_messages")
      .returning("content")
      .then(content => {
        channel_message.content = content;
        io.sockets.emit("channel_message.post", channel_message);
      });
  });

  //Get Channel_Messages
  socket.on("channel_messages.get", channel_message => {
    knex("channel_messages")
      .join("users", "channel_messages.sender_user_id", "=", "users.id")
      .then(channel_messages => {
        socket.emit("channel_messages", channel_messages);
      });
  });

  //Marker moves
  socket.on("marker.move", marker => {
    console.log("marker.move", marker);
    io.sockets.emit("marker.move", marker);
  });

  // User moves
  socket.on("user.move", data => {
    console.log("user.move", data.user, data.position);
    state.seed.users.forEach(user => {
      if (user.id === data.user) {
        user.position = data.position;
      }
    });
    io.sockets.emit("state", state.seed);
  });
});
