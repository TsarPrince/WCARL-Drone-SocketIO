const express = require('express')
const app = express()
const cors = require('cors')
const server = require('http').Server(app)
const io = require('socket.io')(server, {
  cors: {
    origin: '*'
  },
})

app.use(cors())

app.get('/', (_, res) => {
  res.status(200).json({
    status: "SUCCESS",
    msg: "Welcome to WCARL Drone SocketIO Connection",
    routes: {
      'GET /': 'Welcome msg',
      'GET /rooms': 'fetch list of active rooms',
      'GET /clients?roomId=<roomId>': 'fetch all clients connected to `roomId`'
    }
  })
})

app.get('/rooms', (_, res) => {
  try {
    console.log(io.sockets.adapter.rooms)

    // returns Map of Sets
    const rooms = io.sockets.adapter.rooms;
    const numOfRooms = rooms.size

    roomsObj = {}
    rooms.forEach((value, key) => {
      roomsObj[key] = Array.from(value)
    })

    return res.status(200).json({
      status: 'SUCCESS',
      rooms: roomsObj, numOfRooms
    })
  } catch (err) {
    console.log(err)
    return res.status(400).json({
      status: 'ERROR',
      message: err.message
    })
  }
})

app.get('/clients', (req, res) => {
  try {
    const roomId = req.query.roomId

    // returns Set of rooms or undefined
    let clients = io.sockets.adapter.rooms.get(roomId);
    const numOfClients = clients ? clients.size : 0

    // convert Set to Array
    if (clients) {
      clients = Array.from(clients)
    }

    // for (const clientId of clients) {
    //   //this is the socket of each client in the room.
    //   const clientSocket = io.sockets.sockets.get(clientId);
    //   // you can do whatever you need with this
    //   clientSocket.leave('Other Room')
    // }

    return res.status(200).json({
      status: 'SUCCESS',
      roomId, clients, numOfClients
    })
  } catch (err) {
    console.log(err)
    return res.status(400).json({
      status: 'ERROR',
      message: err.message
    })
  }
})

io.on('connection', socket => {
  console.log('Connection received!')
  socket.on('join-room', (roomId, userId) => {
    console.log(`${userId} user joined ${roomId} room`)
    socket.join(roomId)
    socket.to(roomId).emit('user-connected', userId)
    // socket.broadcast.emit('user-connected', userId)            // ⚠️ streams in all rooms

    socket.on('disconnect', () => {
      console.log(`${userId} user disconnected`)
      socket.to(roomId).emit('user-disconnected', userId)
      // socket.broadcast.emit('user-disconnected', userId)       // ⚠️ streams in all rooms
    })
  })
})

server.listen(8080, () => {
  console.log('Listening on http://localhost:8080')
})