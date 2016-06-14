# Node Socket IPC

Simple socket-based inter-process communication for Node.js. This module exposes a pub/sub interface for events and allows specified routines to be remotely called. The [Socket.io](http://socket.io) library is leveraged as the backbone and simple functionality implemented to allow arbitrary messages to be subscribed to.

## Pub/Sub

The simple case for the socket interface is to provide a method of broadcasting messages from a publisher process to one or more subscribers. This can be used to notify the subscribers that messages have been received or computation completed.

### Publisher

Publushers require the `node-socket-ipc` module (this one!). It can be installed by typing:

```
  npm install --save lukem512/node-socket-ipc
```

To publish an event, very little code is needed - it is all handled by the socket module!

```
  let socket = require('node-socket-ipc');
  socket.publish('test', { yourData: 'something here' });
```

Any event name can be specified (here `test` is used); if there are no subscribers the publish method takes no action. Any subscribers are sent the specified data object, in JSON, which is picked up by an event-specific handler.

### Subscriber

Subscribers require the `socket.io-client` module. It can be installed by typing:

```
  npm install --save socket.io-client
```

To subscribe to an event, a socket connection must first be established, specifying the port and host of the publisher.

```
  let io = require('socket.io-client');
  let socket = io.connect('http://localhost:3000', { reconnect: true });

  // Wait for connection
  ebe_socket.on('connect', data => {
    console.log('Socket connected!');
  });
```

To subscribe to an event, a subscriber includes the following code:

```
  // Create a handler, specific to the event
  secure_server_socket.on('test', data => {
    let obj;
    try {
      obj = JSON.parse(data);
      console.log(obj);
    }
    catch (e) {
      console.error('Could not decode JSON payload');
    }
  });

  // Issue the subscribe message
  socket.emit('subscribe', { eventName: 'test' });
```

## Remote Routines

### Routine Publisher

A publisher can create routines to be called remotely. These routines must return a `Promise` and either `resolve` for correct values or `reject` malformed requests.

```
  // Basic function returning a Promise
  function yourFunction(some_param, other_param) {
      return new Promise((resolve, reject) => {
        if (!some_param || !other_param) return reject('Invalid args');
        resolve(some_param > other_param);
      });
  }
```

To expose the routine to callers, the following code is used. Any arguments must be named and are passed using an `args` object.

```
  // Expose the Promised function at 'testRoutine'
  var socket = require('node-socket-ipc');
  socket.routines.add('testRoutine', function(args) {
    return yourFunction(args.some_param, args.some_other_param);
  });
```

### Routine Caller

To call a remote routine a caller creates a socket (as described previously in the Subscriber section) and emits a message containing the `routineName` and an object containing any named parameters. A callback function is then specified and is executed upon execution or failure of the routine.

```
  socket.emit('call', {
    routineName: 'testRoutine',
    args: {
      some_param: 3,
      some_other_param: 1
    }
  }, function(err, success) {
    if (err) return console.error('Error', err);

    if (success) {
      console.log(some_param + ' is greater than ' + some_other_param);
    }
  });
```

The callback should accept an error, `err`, and a return value, here `success`, as defined by the remote routine.
