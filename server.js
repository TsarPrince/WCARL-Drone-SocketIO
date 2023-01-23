const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server, {
  cors: {
    origin: '*'
  },
})

app.get('/', (_, res) => {
  res.status(200).json({
    status: "SUCCESS",
    msg: "Welcome to WCARL Drone SocketIO Connection",
  })
})

io.on('connection', socket => {
  console.log('Connection received!')
  socket.on('join-room', (roomId, userId) => {
    console.log(`${userId} user joined ${roomId} room`)
    socket.join(roomId)
    socket.broadcast.emit('user-connected', userId)

    socket.on('disconnect', () => {
      console.log(`${userId} user disconnected`)
      socket.broadcast.emit('user-disconnected', userId)
    })
  })
})

server.listen(8080, () => {
  console.log('Listening on http://localhost:8080')
})