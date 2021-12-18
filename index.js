let proxy_setup = (temp_port, client) => {
	const http = require('http');
	const net = require('net');
	const url = require('url');
	const db = client.db('proxy_server');
	db.collection('logs').deleteMany({});
	const proxy_server = http.createServer((client_request, client_response) => {
		const client_http_url = url.parse(client_request.url, true);
		if (client_http_url.hostname && client_request.method) {
			db.collection('blocked_websites').find({Hostname: client_request.hostname}).toArray((error, results) => {
				if (results.length > 0) {
					db.collection('logs').insertOne({
						Status: "BLOCKED",
						Method: client_request.method,
						Hostname: client_http_url.hostname
					});
					if (client_request.method == "GET") {
						console.log('BLOCKED', client_request.method, '   ', '|' + client_http_url.hostname);
					} else if (client_request.method == "POST") {
						console.log('BLOCKED', client_request.method, '  ', '|' + client_http_url.hostname);
					} else if (client_request.method == "HEAD") {
						console.log('BLOCKED', client_request.method, '  ', '|' + client_http_url.hostname);
					} else {
						console.log('BLOCKED', client_request.method, '  ', '|' + client_http_url.hostname);
					}
					client_request.destroy();
					client_response.end();
					client_response.destroy();
				} else {
					db.collection('logs').insertOne({
						Status: "ALLOWED",
						Method: client_request.method,
						Hostname: client_http_url.hostname
					});
					if (client_request.method == "GET") {
						console.log('ALLOWED', client_request.method, '   ', '|' + client_http_url.hostname);
					} else if (client_request.method == "POST") {
						console.log('ALLOWED', client_request.method, '  ', '|' + client_http_url.hostname);
					} else if (client_request.method == "HEAD") {
						console.log('ALLOWED', client_request.method, '  ', '|' + client_http_url.hostname);
					} else {
						console.log('ALLOWED', client_request.method, '  ', '|' + client_http_url.hostname);
					}
					var options = {
						hostname : client_http_url.hostname,
						port : 80,
						path : client_http_url.pathname,
						method : client_request.method,
						headers : client_request.headers
					}
					var server_request = http.request(options, (server_response) => {
						client_response.writeHead(server_response.statusCode, server_response.headers);
						server_response.on('error', (error) => {
							console.log('        ERROR   |http server response error!', server_request.remoteAddress, ':', server_request.remotePort);
						});
						server_response.pipe(client_response, {
							end : true
						});
						client_request.pipe(server_request, {
							end : true
						});
					});
					server_request.on('error', (error) => {
						console.log('        ERROR   |http server request error!', server_request.remoteAddress, ':', server_request.remotePort);
					});
					client_request.on('error', (error) => {
						console.log('        ERROR   |http client request error!', client_request.remoteAddress, ':', client_request.remotePort);
					});
					client_response.on('error', (error) => {
						console.log('        ERROR   |http client response error!', client_request.remoteAddress, ':', client_request.remotePort);
					});
				}
			});
		}
	});

	const proxy_server_listener = proxy_server.listen(temp_port, (error) => {
		if (error) {
			console.log('        ERROR   |proxy server listener error!');
			return;
		} else {
			const listener_local_ip = proxy_server_listener.address();
			console.log('Nodejs Proxy Server running on port: ' + listener_local_ip.port);
			console.log('================================================');
			console.log('STATUS ', 'METHOD ', ' URL');
			console.log('================================================');
		}
	});

	proxy_server.on('connect', (request, client_socket, head) => {
		const { port, hostname } = url.parse(`//${request.url}`, false, true);
		if (hostname && port) {
			db.collection('blocked_websites').find({Hostname: hostname}).toArray((error, results) => {
				if (results.length > 0) {
					db.collection('logs').insertOne({
						Status: "BLOCKED",
						Method: request.method,
						Hostname: hostname
					});
					if (request.method == "GET") {
						console.log('BLOCKED', request.method, '   ', '|' + hostname);
					} else if (request.method == "POST") {
						console.log('BLOCKED', request.method, '  ', '|' + hostname);
					} else if (request.method == "CONNECT") {
						console.log('BLOCKED', request.method, '|' + hostname);
					} else if (request.method == "HEAD") {
						console.log('BLOCKED', request.method, '|' + hostname);
					} else {
						console.log('BLOCKED', request.method, '|' + hostname);
					}
					client_socket.end();
					client_socket.destroy();
				} else {
					const server_socket = net.connect(port, hostname);
					server_socket.on('error', (error) => {
						console.log('        ERROR   |server socket error!', server_socket.remoteAddress, ':', server_socket.remotePort);
						client_socket.end();
						client_socket.destroy();
					});
					client_socket.on('error', (error) => {
						console.log('        ERROR   |client socket error!', client_socket.remoteAddress, ':', client_socket.remotePort);
						server_socket.end();
						server_socket.destroy();
					});
					client_socket.on('close', () => {
						server_socket.end();
						server_socket.destroy();
					});
					server_socket.on('close', () => {
						client_socket.end();
						client_socket.destroy();
					});
					server_socket.on('connect', () => {
						db.collection('logs').insertOne({
							Status: "ALLOWED",
							Method: request.method,
							Hostname: hostname
						});
						if (request.method == "GET") {
							console.log('ALLOWED', request.method, '   ', '|' + hostname);
						} else if (request.method == "POST") {
							console.log('ALLOWED', request.method, '  ', '|' + hostname);
						} else if (request.method == "CONNECT") {
							console.log('ALLOWED', request.method, '|' + hostname);
						} else if (request.method == "HEAD") {
							console.log('ALLOWED', request.method, '|' + hostname);
						} else {
							console.log('ALLOWED', request.method, '|' + hostname);
						}
						client_socket.write([
							'HTTP/1.1 200 Connection Established',
							'Proxy-agent: zeoxy'
						].join('\r\n'));
						client_socket.write('\r\n\r\n');
						server_socket.pipe(client_socket, {
							end: true
						});
						client_socket.pipe(server_socket, {
							end: true
						});
					});
				}
			});
		} else {
			client_socket.end();
			client_socket.destroy();
		}
	});

	process.on('SIGINT', () => {
		console.log();
		console.log('SIGINT signal received. Closing the server.');
		proxy_server.close((error) => {
			if (error) {
				console.log(error);
				process.exit();
			} else {
				console.log('Closed the server.');
				client.close((error) => {
					if (error) {
						console.log(error);
						process.exit();
					} else {
						console.log('Closed connection to mongodb.');
						process.exit();
					}
				});
			}
		});
	});
}

const mongodb = require('mongodb');
const db_url = 'mongodb://127.0.0.1:27017';

let client = new mongodb.MongoClient(db_url);
client.connect()
.then(() => {
	console.log('Connected to mongodb.');
	proxy_setup(8080, client);
}).catch((error) => {
	console.log(error);
	process.exit();
});
