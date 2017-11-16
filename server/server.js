const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);

let connections = [];

// Set up the seed database
// TODO refactor into a require file.

let state = require('./seed.js')
console.log(state.seed )

server.listen(process.env.PORT || 3001)

//Index HTML is for debugging
app.get('/', (req, res) =>{
    res.sendFile(__dirname + '/index.html');
});

//Socket on connect
io.sockets.on('connection', (socket) => {
    connections.push(socket);
    console.log('Connected: %s sockets connected', connections.length);
    io.sockets.emit('state', state.seed)

    //Disconnect
    socket.on('disconnect', (data) => {
        connections.splice(connections.indexOf(socket), 1);
        console.log('Disconnected %s sockets connnected', connections.length);
    });

    //Recieve Messages
    socket.on('chat.postmessage', (message) => {
        state.seed.messages.push(message)
        io.sockets.emit('state', state.seed)
        console.log('chat.postmessage', message);
    });
});