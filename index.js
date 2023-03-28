const express = require('express')
const app = express()
const cors = require('cors')

// uploading video to google drive
const multer = require('multer');
const { google } = require('googleapis');
const { Readable } = require('stream');

const dotenv = require('dotenv')
dotenv.config()

const PORT = process.env.PORT || 8080

const server = require('http').Server(app)
const io = require('socket.io')(server, {
  cors: {
    origin: '*'
  },
})

app.use(cors())

const jwtClient = new google.auth.JWT({
  scopes: ['https://www.googleapis.com/auth/drive'],
  email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
  key: process.env.GOOGLE_DRIVE_PRIVATE_KEY
});

const drive = google.drive({
  version: 'v3',
  auth: jwtClient,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // Limit file size to 50MB
  },
});

app.post('/upload', upload.single('video'), async (req, res) => {
  console.log(req.file)
  try {
    const { originalname, mimetype, buffer } = req.file;

    const driveFileMetadata = {
      name: originalname,
      parents: ['17af3fGdS98wHNYY-gV8e9KgHg2JjCiWj'], // Replace with the ID of the folder you want to upload to
    };

    const driveFile = {
      mimeType: mimetype,
      // ⭐⭐⭐ following won't work ⭐⭐⭐
      // body: buffer.toString('base64'),
      // body: buffer.toString('utf-8'),
      // body: new ArrayBuffer(buffer),
      // body: new Uint8Array(buffer),
      body: Readable.from(buffer),
    };

    // ⭐⭐⭐ this is not synchronous, except it is! ⭐⭐⭐
    const uploadedFile = await drive.files.create({
      resource: driveFileMetadata,
      media: driveFile,
      fields: 'id',
    });

    console.log('File uploaded:', uploadedFile.data.id);
    res.status(200).send('File uploaded successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

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

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`)
})