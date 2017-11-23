const ENV = process.env.NODE_ENV || "development";

if (ENV === "development") {
  require("dotenv").config();
}

const knexConfig = require("../knexfile.js");
const knex = require("knex")(knexConfig[ENV]);
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const uuidv4 = require("uuid/v4");
const path = require("path");

let connections = [];

const staticPath = path.resolve(__dirname, "..", "build");

server.listen(process.env.PORT || 3001);

console.log("/public", staticPath);
app.use(express.static(staticPath));

if (ENV === "development") {
  //Index HTML is for debugging
  app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
  });
}

//Socket on connect
io.sockets.on("connection", socket => {
  connections.push(socket);
  let isLoggedIn = false;
  console.log("Connected: %s sockets connected", connections.length);

  //Disconnect
  socket.on("disconnect", data => {
    connections.splice(connections.indexOf(socket), 1);
    isLoggedIn = false;
    console.log("Disconnected %s sockets connnected", connections.length);
  });

  ///////////////////////////////////////////////////////////////////////////
  // Define all the user data functions here for closure.
  // getUsers is called at the beginning to load all the users for a newly logged in person
  function getUsers(user) {
    knex
      .select()
      .from("users")
      .then(users => {
        users.forEach(user => {
          user.position = { lat: user.lat, lng: user.lng };
        });
        socket.emit("users", users);
      });
  }
  function userMove(user) {
    knex("users")
      .where("id", "=", user.id)
      .update({
        lat: user.lat,
        lng: user.lng
      })
      .then(numRows => {
        io.sockets.emit("user.move", user);
      });
  }
  // Get all the channels for a user
  function getChannels(user) {
    knex
      .select()
      .from("channels")
      .then(channels => {
        socket.emit("channels", channels);
      });
  }
  function getChannelMessages(user) {
    knex("channel_messages")
      .join("users", "channel_messages.sender_user_id", "=", "users.id")
      .then(channel_messages => {
        socket.emit("channel_messages", channel_messages);
      });
  }
  function getDirectMessages(user) {
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
  }

  function getLayers(user) {
    knex
      .select()
      .from("layers")
      .then(layers => {
        socket.emit("layers", layers);
      });
  }
  function getMarkers(user) {
    knex("markers")
      .select()
      .then(markers => {
        markers.forEach(marker => {
          marker.position = { lat: marker.lat, lng: marker.lng };
        });
        socket.emit("markers", markers);
      });
  }
  function getCircles(user) {
    knex("circles")
      .select()
      .then(circles => {
        circles.forEach(circle => {
          circle.center = { lat: circle.lat, lng: circle.lng };
        });
        socket.emit("circles", circles);
      });
  }

  function markerMove(marker) {
    knex("markers")
      .where("id", "=", marker.id)
      .update({
        lat: marker.lat,
        lng: marker.lng
      })
      .then(numRows => {
        io.sockets.emit("marker.move", marker);
      });
  }

  function markerAdd(marker) {
    knex("markers")
      .insert({
        lat: marker.lat,
        lng: marker.lng
      })
      .then(id => {
        marker.id = id;
        io.sockets.emit("marker.add", marker);
      });
  }
  function circleMove(circle) {
    knex("circles")
      .where("id", "=", circle.id)
      .update({
        lat: circle.lat,
        lng: circle.lng
      })
      .then(numRows => {
        io.sockets.emit("circle.move", circle);
      });
  }
  function circleCreate(circle) {
    console.log("circleCreate(", circle);
    knex("circles")
      .insert({
        label: circle.label,
        description: circle.description,
        lat: circle.lat,
        lng: circle.lng,
        radius: circle.radius
      })
      .then(id => {
        circle.id = id;
        io.sockets.emit("circle.create", circle);
      });
  }
  ///////////////////////////////////////////////////////////////////////////
  // Here is all the socket state information.
  // socket.on("user.register", user => {
  //   knex
  //     .insert(user)
  //     .into("users")
  //     .returning("id");.then(id => {

  //     })
  // });
  socket.on("user.login", user => {
    const password = user.password;
    knex("users")
      .where({ email: user.email })
      .select()
      .then(users => {
        if (users.length == 0) {
          socket.emit("user.login_email_error");
        } else if (password !== users[0].password) {
          socket.emit("user.login_pass_error");
        } else {
          isLoggedIn = true;
          let user = users[0];

          user.position = { lat: user.lat, lng: user.lng };
          socket.emit("user.logged_in", user);

          // User is logged in, send them the user info,
          // existing users, channels, messages, maps and markers
          getUsers(user);
          getChannels(user);
          getDirectMessages(user);
          getChannelMessages(user);
          getLayers(user);
          getMarkers(user);
          getCircles(user);
        }
      });
  });

  //Get Users
  socket.on("users.get", user => {
    console.log("Here", user);
    getUsers(user);
  });

  // Get Channels
  socket.on("channels.get", user => {
    getChannels(user);
  });

  //Get Direct_Messages
  socket.on("direct_messages.get", user => {
    getDirectMessages(user);
  });
  //Get Layers
  socket.on("layers.get", user => {
    getLayers(user);
  });

  //Get Markers
  socket.on("markers.get", user => {
    getMarkers(user);
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
      .returning("id")
      .then(id => {
        channel_message.id = id;
        io.sockets.emit("channel_message.post", channel_message);
      });
  });

  //Get Channel_Messages
  socket.on("channel_messages.get", user => {
    getChannelMessages(user);
  });

  //Marker functions
  socket.on("marker.move", marker => {
    markerMove(marker);
  });

  socket.on("marker.add", marker => {
    markerAdd(marker);
  });

  // User functions
  // user.move contains id=userId and lat, lng of new position
  socket.on("user.move", user => {
    userMove(user);
  });

  // Circle functions
  socket.on("circle.create", circle => {
    circleCreate(circle);
  });

  socket.on("circles.get", user => {
    getCircles(user);
  });
  socket.on("circle.move", circle => {
    circleMove(circle);
  });
});
