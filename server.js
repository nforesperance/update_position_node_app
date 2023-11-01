'use strict';
var amqp = require('amqplib/callback_api');



const express = require('express');

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';
const QUEUE_NAME = 'update_position';
// amqp_url with username and password
const amqp_url = 'amqp://test:test@localhost:5672';

// App
const app = express();
app.use(express.json());

function sendDataByAmqp(data) {
    amqp.connect(amqp_url, function (error0, connection) {
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
            channel.assertQueue(QUEUE_NAME, {
                durable: false
            });
            channel.sendToQueue(QUEUE_NAME, Buffer.from(data));
            console.log(" [x] Sent %s", data);

            setTimeout(function () {
                connection.close();
            }, 500);
            return 0;
        });
    });


}
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
    var sent = sendDataByAmqp(JSON.stringify(data));
    res.json(data);
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);

const gracefulShutdown = () => {
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // Sent by nodemon
