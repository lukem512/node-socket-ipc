"use strict"

// Inter-process notifications
// Luke Mitchell, 13/06/2016
let SOCKET_PORT = process.env.SOCKET_PORT || 3000;

let EVENT_NAME_WILDCARD = '*';

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// Object containing subscribers to events
let subscriptions = {};

// Object containing routines to call
let routines = {};

// Set up the socket
server.listen(SOCKET_PORT, function () {
  console.log('[SOCKET] Listening at port ' + SOCKET_PORT);
});

// Call a routine
function call(routineName) {
  if (routines[routineName]) {
    routines[routineName]();
  }
};

// Add a new routine
function addRoutine(routineName, fn) {
  routines[routineName] = fn;
};

// Remove a routine
function removeRoutine(routineName) {
  delete routines[routineName];
};

// Create a subscription
function subscribe(eventName, socket) {
  if (eventName == EVENT_NAME_WILDCARD) {
    Object.keys(subscriptions).forEach(key => {
      subscribe(key, socket);
    });
  } else {
    // New list?
    if (!subscriptions[eventName]) {
      subscriptions[eventName] = [];
    }

    // Is the subscription already present?
    let existing = subscriptions[eventName].find(obj => {
      return (obj == socket);
    });

    if (!existing) {
      subscriptions[eventName].push(socket);
    }
  }
};

// Delete a subscription
function unsubcribe(eventName, socket) {
  if (eventName == EVENT_NAME_WILDCARD) {
    Object.keys(subscriptions).forEach(key => {
      unsubscribe(key, socket);
    });
  } else {
    // Empty list?
    if (!subscriptions[eventName]) return;

    // Delete the subscription using the filter, recreatign the array
    subscriptions[eventName] = subscriptions[eventName].filter(obj => {
      return (obj !== socket);
    })

    // Delete the list if it's empty
    if (subscriptions[eventName].length == 0) {
      delete subscriptions[eventName];
    }
  }
};

// Send a message to all subscribers
function publish(eventName, message) {
  if (!subscriptions[eventName]) return;

  let data = JSON.stringify(message);

  console.log('[SOCKET] Publishing to \'' + eventName + '\'. There are ' + subscriptions[eventName].length + ' subscriptions.');
  subscriptions[eventName].forEach(conn => {
    conn.emit(eventName, data);
  });
}

// Events fired for each new connection
io.on('connection', function(socket) {
  console.log('[SOCKET] New connection from ' + socket.client.conn.remoteAddress);

  socket.on('call', function(data) {
    console.log('[SOCKET] Received call command for \'' + data.routineName + '\'');
    call(data.routineName);
  });

  socket.on('subscribe', function(data) {
    console.log('[SOCKET] Adding subscription to \'' + data.eventName + '\'');
    subscribe(data.eventName, socket);
  });

  socket.on('unsubcribe', function(data) {
    console.log('[SOCKET] Removing subscription from \'' + data.eventName + '\'');
    unsubcribe(data.eventName, socket);
  });

  socket.on('disconnect', function() {
    console.log('[SOCKET] Client disconnected');
  });
});

module.exports.SOCKET_PORT = SOCKET_PORT;
module.exports.EVENT_NAME_WILDCARD = EVENT_NAME_WILDCARD;

module.exports.routines = {};
module.exports.routines.add = addRoutine;
module.exports.routines.remove = removeRoutine;

module.exports.publish = publish;
