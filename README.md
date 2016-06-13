# Node Socket IPC

Simple socket-based inter-process communication for Node.js. Subscribers are handled automatically.

```
  var socket = require('node-socket-ipc');
  socket.publish('news', { data: 'This is news', author: 'Luke' });
```
