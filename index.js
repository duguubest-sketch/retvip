const http = require("http")
const socket = require("websocket").server

// 1. Render dynamic port assign karta hai, isliye process.env.PORT use karna zaroori hai
const PORT = process.env.PORT || 3000; 

// 2. HTTP Server create kiya taaki Render ko "Live" status mil sake
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end("Signaling Server is Live and Running!");
})

// 3. Server ko listen karwaya (0.0.0.0 se ye bahar ki duniya ke liye open ho jata hai)
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is listening on port ${PORT}`);
});

const users = []

const Types = {
    SignIn: "SignIn",
    StartStreaming: "StartStreaming",
    UserFoundSuccessfully: "UserFoundSuccessfully",
    Offer: "Offer",
    Answer: "Answer",
    IceCandidates: "IceCandidates",
    EndCall: "EndCall",
}

// 4. WebSocket setup jo hamare HTTP server ka use karega
const webSocket = new socket({httpServer: server})

webSocket.on('request', (req) => {
    const connection = req.accept();

    connection.on('message', (message) => {
        try {
            const data = JSON.parse(message.utf8Data);
            const currentUser = findUser(data.username)
            const userToReceive = findUser(data.target)
            console.log("Received data:", data.type, "from:", data.username);

            switch (data.type) {
                case Types.SignIn:
                    if (currentUser) {
                        // Agar user pehle se hai toh purana connection update kar sakte hain
                        currentUser.conn = connection;
                        return;
                    }
                    users.push({username: data.username, conn: connection, password: data.data})
                    break
                
                case Types.StartStreaming :
                    if (userToReceive) {
                            sendToConnection(userToReceive.conn, {
                                type: Types.StartStreaming,
                                username: currentUser.username,
                                target: userToReceive.username
                            })
                    }
                    break

                case Types.Offer :
                    if (userToReceive) {
                        sendToConnection(userToReceive.conn, {
                            type: Types.Offer, username: data.username, data: data.data
                        })
                    }
                    break

                case Types.Answer :
                    if (userToReceive) {
                        sendToConnection(userToReceive.conn, {
                            type: Types.Answer, username: data.username, data: data.data
                        })
                    }
                    break

                case Types.IceCandidates:
                    if (userToReceive) {
                        sendToConnection(userToReceive.conn, {
                            type: Types.IceCandidates, username: data.username, data: data.data
                        })
                    }
                    break

                case Types.EndCall:
                    if (userToReceive) {
                        sendToConnection(userToReceive.conn, {
                            type: Types.EndCall, username: data.username
                        })
                    }
                    break
            }
        } catch (e) {
            console.log("Error handling message:", e.message)
        }
    });

    connection.on('close', () => {
        // User disconnect hone par list se hatana
        for (let i = 0; i < users.length; i++) {
            if (users[i].conn === connection) {
                console.log("User disconnected:", users[i].username);
                users.splice(i, 1);
                break;
            }
        }
    })
});

const sendToConnection = (connection, message) => {
    if (connection) {
        connection.send(JSON.stringify(message))
    }
}

const findUser = username => {
    return users.find(user => user.username === username);
}
