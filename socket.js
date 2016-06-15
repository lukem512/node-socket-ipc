"use strict"

// Inter-process notifications
// Luke Mitchell, 13/06/2016
let SOCKET_PORT = process.env.SOCKET_PORT || 3000;

let LOG_PREFIX = process.env.LOG_PREFIX || '';

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
  console.log(LOG_PREFIX + '[SOCKET] Listening at port ' + SOCKET_PORT);
});

// Call a routine, returning the promise
function call(routineName, args) {
  if (routines[routineName]) {
    console.log(LOG_PREFIX + '[SOCKET] Calling routine with name \'' + routineName + '\'');
    return routines[routineName](args);
  }
};

// Add a new routine
function addRoutine(routineName, fn) {
  console.log(LOG_PREFIX + '[SOCKET] Adding routine to ' + routineName);
  routines[routineName] = fn;
};

// Remove a routine
function removeRoutine(routineName) {
  console.log(LOG_PREFIX + '[SOCKET] Removing routine from ' + routineName);
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
function unsubscribe(eventName, socket) {
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

  console.log(LOG_PREFIX + '[SOCKET] Publishing to \'' + eventName + '\'. There are ' + subscriptions[eventName].length + ' subscriptions.');
  subscriptions[eventName].forEach(conn => {
    conn.emit(eventName, data);
  });
}

// Events fired for each new connection
io.on('connection', socket => {
  console.log(LOG_PREFIX + '[SOCKET] New connection from ' + socket.client.conn.remoteAddress);

  socket.on('call', (data, fn) => {
    let args = data.args || {};
    let routineName = data.routineName;

    if (!routineName) {
      console.error('[SOCKET] routineName not provided');
      return fn({ message: 'routineName not provided' }, false);
    }

    console.log(LOG_PREFIX + '[SOCKET] Received call command for \'' + routineName + '\'');

    call(routineName, args)
      .then(result => {
        console.log(LOG_PREFIX + '[SOCKET] Call command was resolved with value', result);
        return fn(null, result);
      })
      .catch(err => {
        console.error('[SOCKET] Call command was rejected with error', err);
        return fn(err, false)
      });
  });

  socket.on('subscribe', data => {
    let eventName = data.eventName;
    if (!eventName) {
      return console.error('[SOCKET] eventName not provided');
    }

    console.log(LOG_PREFIX + '[SOCKET] Adding subscription to \'' + eventName + '\'');
    subscribe(eventName, socket);
  });

  socket.on('unsubcribe', data => {
    let eventName = data.eventName;
    if (!eventName) {
      return console.error('[SOCKET] eventName not provided');
    }

    console.log(LOG_PREFIX + '[SOCKET] Removing subscription from \'' + eventName + '\'');
    unsubscribe(eventName, socket);
  });

  socket.on('disconnect', function() {
    console.log(LOG_PREFIX + '[SOCKET] Client disconnected');
    unsubscribe(EVENT_NAME_WILDCARD, socket);
  });
});

module.exports.SOCKET_PORT = SOCKET_PORT;
module.exports.EVENT_NAME_WILDCARD = EVENT_NAME_WILDCARD;

module.exports.routines = {};
module.exports.routines.add = addRoutine;
module.exports.routines.remove = removeRoutine;

module.exports.publish = publish;
