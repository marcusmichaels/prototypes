import http from 'node:http';

const messages = [];
// Store all connected clients as writable streams
const clients = new Set();

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Enable CORS

  if (req.method === 'POST' && req.url === '/send') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      const message = JSON.parse(body);
      console.log('Received message:', message);

      if (messages.length < 5) {
        messages.push(message);
      } else {
        messages.shift();
        messages.push(message);
      }

      // Broadcast the new message to all connected clients
      clients.forEach(client => {
        client.write(`data: ${JSON.stringify(message)}\n\n`);
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'Message sent' }));
    });
  } else if (req.method === 'GET' && req.url === '/events') {
    // Handle EventSource connection for this specific client
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Immediately flush headers
    res.flushHeaders();

    // Add the client to the set of active connections
    clients.add(res);
    console.log('Client connected. Total clients:', clients.size);

    const [latestMessage] = messages.slice(-1);

    if (latestMessage) {
      res.write(`data: ${JSON.stringify(latestMessage)}\n\n`);
    };

    // Send a heartbeat every 10 seconds
    const interval = setInterval(() => {
      res.write(': heartbeat\n\n'); // Keep the connection alive
    }, 10000);

    // Remove the client when they disconnect
    req.on('close', () => {
      clearInterval(interval);
      clients.delete(res);
      console.log('Client disconnected. Total clients:', clients.size);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = 3210;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
