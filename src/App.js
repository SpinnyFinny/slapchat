import React, { Component } from "react";
import io from "socket.io-client";
import Map from "./Map.js";
import MessageList from "./MessageList.js";
import SideBar from "./SideBar.js";
import NavBar from "./NavBar.js";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      users: [],
      direct_messages: [],
      channel_messages: [],
      messages: [],
      channels: [],
      markers: [],
      layers: [],
      loading: false,
      currentUser: null,
      currentChannel: null,
      currentDirectMessage: null
    };
    this.onNewMessage = this.onNewMessage.bind(this);
    this.sendServer = this.sendServer.bind(this);
  }

  //RECIVES STATE DATA
  componentDidMount() {
    this.socket = io("localhost:3001");

    this.socket.emit("users.get", {
      user: 0
    });
    this.socket.emit("layers.get", {
      user: 0
    });
    this.socket.emit("markers.get", {
      user: 0
    });
    this.socket.emit("channels.get", {
      user: 0
    });
    this.socket.emit("direct_messages.get", {
      user: 0
    });
    this.socket.emit("channel_messages.get", {
      user: 0
    });
    this.socket.emit("markers.get", {
      user: 0
    });
    this.socket.on("users", users => {
      this.setState({ users: users, currentUser: users[0].id });
      console.log("users", users[0].id);
    });
    this.socket.on("channels", channels => {
      this.setState({ channels: channels, currentChannel: channels[0].id });
      console.log("channels", channels[0].id);
    });
    this.socket.on("direct_messages", direct_messages => {
      this.setState({ direct_messages: direct_messages });
    });
    this.socket.on("channel_messages", channel_messages => {
      channel_messages.type = "channel_messages";
      this.setState({ channel_messages: channel_messages });
    });
    this.socket.on("channel_message.post", channel_message => {
      console.log("channel_message.post", channel_message);
      this.setState({
        channel_messages: this.state.channel_messages.concat(channel_message)
      });
    });
    this.socket.on("markers", markers => {
      this.setState({ markers: markers });
    });
    this.socket.on("layers", layers => {
      this.setState({ layers: layers });
    });
    this.socket.on("user.move", data => {
      this.setState({ users: data.position });
    });
  }

  // when we get a new message, send it to the server
  // this will be called from the ChatBar component when a user presses the enter key.
  onNewMessage = function onNewMessage(content) {
    // Send the msg object as a JSON-formatted string.
    let action =
      this.state.currentChannel != null
        ? "channel_message.post"
        : "direct_message.post";
    let payload = {};

    if (action === "channel_message.post") {
      payload = {
        sender_user_id: this.state.currentUser,
        channel_id: this.state.currentChannel,
        content: content
      };
    } else {
      payload = {
        sender_user_id: this.state.currentUser,
        recipient_user_id: this.state.currentDirectMessage,
        content: content
      };
    }
    console.log("onNewMessage", action, payload);
    this.socket.emit(action, payload);
  };

  // When a lower level component needs to send something to the server
  // it calls sendServer(action, payload)
  sendServer = function sendServer(action, payload) {
    console.log("sendServer", action, payload);
    this.socket.emit(action, payload);
  };

  render() {
    return (
      <div className="fixed-container">
        <SideBar users={this.state.users} channels={this.state.channels} />
        <main className="nav-and-content">
          <NavBar />
          {this.state.loading ? (
            <div>Loading</div>
          ) : (
            <section className="messages-and-map">
              <MessageList
                channel_messages={this.state.channel_messages}
                direct_messages={this.state.direct_messages}
                onNewMessage={this.onNewMessage}
              />
              <Map
                sendServer={this.sendServer}
                markers={this.state.markers}
                users={this.state.users}
              />
            </section>
          )}
        </main>
      </div>
    );
  }
}

export default App;
