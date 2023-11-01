'use strict';
var amqp = require('amqplib/callback_api');

function sendDataByAmqp(queue, data) {
    amqp.connect('amqp://localhost', function (error0, connection) {
        if (error0) {
             console.log(error0);
            return -1;

        }
        connection = connection;
        connection.createChannel(function (error1, channel) {
            if (error1) {
                 console.log(error1);
                return -1;
            }
            channel.assertQueue(queue, {
                durable: false
            });
            channel.sendToQueue(queue, Buffer.from(data));
            console.log(" [x] Sent %s", data);

            setTimeout(function () {
                connection.close();
                process.exit(0)
            }, 500);
            return 0;
        });
    });


}

const express = require('express');

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// App
const app = express();
app.use(express.json());


app.get('/', (req, res) => {
    res.send('Hello World');
});
app.post('/update_position', (req, res) => {

    //Get data from the request
    let requestReauest = req.body;
    // log body
    console.log(requestReauest);
    let id = requestReauest.id;
    let latitude = requestReauest.latitude;
    let longitude = requestReauest.longitude;
    //check for null values
    if (id == null || latitude == null || longitude == null) {
        res.status(400).send('Bad Request');
    }
    //check for undefined values
    if (id == undefined || latitude == undefined || longitude == undefined) {
        res.status(400).send('Bad Request');
    }
    //check for empty values
    if (id == "" || latitude == "" || longitude == "") {
        res.status(400).send('Bad Request');
    }

    let data = {
        "id": req.body.id,
        "latitude": 12.123456,
        "longitude": 12.123456,
        "client": "nodejs",
    }
    var sent = sendDataByAmqp('update_position', JSON.stringify(data));
    console.log(sent);

    res.json(data);
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);

const gracefulShutdown = () => {
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // Sent by nodemon
