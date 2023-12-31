'use strict';
var amqp = require('amqplib/callback_api');
var jwt = require('jsonwebtoken');
const express = require('express');
const jwtMiddleware = require('./auth/authMiddleware');
const router = require('./nominatim/router');
//load env
require('dotenv').config()

// Constants
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const QUEUE_NAME = process.env.QUEUE || 'update_position';
// amqp_url with username and password
// Define the connection URL and the queue name
const amqp_url = 'amqp://test:test@localhost:5672';
// Declare global variables for the connection and the channel
var connection = null;
var channel = null;



// Define a function that creates the connection and the channel
function createConnectionAndChannel(callback) {
    // Connect to the broker using the URL
    amqp.connect(amqp_url, function (err, conn) {
        // If there is an error, log it and retry after some time
        if (err) {
            console.error('[AMQP]', err.message);
            return setTimeout(createConnectionAndChannel, 1000, callback);
        }
        // Set the connection variable and register the event handlers
        connection = conn;
        connection.on('error', function (err) {
            if (err.message !== 'Connection closing') {
                console.error('[AMQP] conn error', err.message);
            }
        });
        connection.on('close', function () {
            console.error('[AMQP] reconnecting');
            return setTimeout(createConnectionAndChannel, 1000, callback);
        });
        connection.on('blocked', function (reason) {
            console.warn('[AMQP] blocked', reason);
        });
        connection.on('unblocked', function () {
            console.info('[AMQP] unblocked');
        });
        // Create the channel using the connection
        createChannel(connection, callback);


    });
}

function createChannel(connection, callback) {
    // Create the channel using the connection
    connection.createChannel(function (err, ch) {
        // If there is an error, log it and close the connection
        if (err) {
            console.error('[AMQP] channel error', err.message);
            connection.close();
            return setTimeout(createConnectionAndChannel, 1000, callback);
            return;
        }
        // Set the channel variable and register the event handlers
        channel = ch;
        channel.on('error', function (err) {
            console.error('[AMQP] channel error', err.message);
            connection.close();
            return setTimeout(createConnectionAndChannel, 1000, callback);
        });
        channel.on('close', function () {
            console.log('[AMQP] channel closed');
        });
        // Assert the queue using the channel
        channel.assertQueue(QUEUE_NAME, { durable: false });
        // Call the callback function if provided
        if (callback) {
            callback();
        }
    });
}




// Define a function that sends a message to the queue using the channel
function sendMessage(message) {
    // If the channel is not ready, wait until it is
    if (!channel) {
        return createConnectionAndChannel(function () {
            sendMessage(message);
        });
    }
    // Convert the message to a buffer and send it to the queue
    var buffer = Buffer.from(message);
    channel.sendToQueue(QUEUE_NAME, buffer, { persistent: true, contentType: 'update_position', });
    console.log('[AMQP] sent', message);
}

// Define a function that receives a message from the queue using the channel
function receiveMessage() {
    //https://stackoverflow.com/questions/42567689/rabbitmq-precondition-failed-unknown-delivery-tag
    // If the channel is not ready, wait until it is
    if (!channel) {
        return createConnectionAndChannel(function () {
            receiveMessage();
        });
    }
    // Consume the queue and handle the messages
    channel.consume(QUEUE_NAME, function (msg) {
        if (msg !== null) {
            var message = msg.content.toString();
            console.log('[AMQP] received', message);
            // Do something with the message here
            // ...
            // Acknowledge the message
            channel.ack(msg);
        }
    });
}

// Test the functions
// sendMessage('Hello World!');
// receiveMessage();




// App
const app = express();
app.use(express.json());



// amqp.connect().then(function (conn) {
//     // Everything ok, but ..
//     throw new Error('SNAFU');
// }, function (err) {
//     console.error('Connect failed: %s', err);
// }).then(null, function (err) {
//     console.error('Connect succeeded, but error thrown: %s', err);
// });
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
app.post('/update_position', jwtMiddleware, (req, res) => {
    //Get data from the request
    let requestReauest = req.body;
    // log body
    let latitude = requestReauest.latitude;
    let longitude = requestReauest.longitude;
    //check for null values
    if (latitude == null || longitude == null) {
        res.status(400).send('Bad Request');
    }
    //check for undefined values
    if (latitude == undefined || longitude == undefined) {
        res.status(400).send('Bad Request');
    }
    //check for empty values
    if (latitude == "" || longitude == "") {
        res.status(400).send('Bad Request');
    }

    let data = {
        // "id": req.user_id,
        "id": generateRandomIntegers(1),
        "latitude": generateRandomIntegers(2) + "." + generateRandomIntegers(6),
        "longitude": generateRandomIntegers(2) + "." + generateRandomIntegers(6),
        "client": "nodejs",
    }
    // var sent = sendMessage(JSON.stringify(data));
    res.json(data);
});

function generateRandomIntegers(n) {
    let result = '';
    for (let i = 0; i < n; i++) {
        result += Math.floor(Math.random() * 9) + 1;
    }
    return result;
}

app.use('/nominatim', router);
//
app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);

const gracefulShutdown = () => {
    console.log('Received kill signal, shutting down gracefully');
    if (connection) {
        connection.close(() => {
            console.log('Closed out remaining connections');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // Sent by nodemon
