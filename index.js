import http from "http";
import net from "net";
import url from "url";

const proxy_setup = (temp_port) => {
  const proxy_server = http.createServer((client_request, client_response) => {
    const client_http_url = url.parse(client_request.url, true);
    if (client_http_url.hostname && client_request.method) {
      console.log(
        "ALLOWED",
        client_request.method,
        `|${client_http_url.hostname}`,
      );
      const options = {
        hostname: client_http_url.hostname,
        port: 80,
        path: client_http_url.pathname,
        method: client_request.method,
        headers: client_request.headers,
      };
      const server_request = http.request(options, (server_response) => {
        client_response.writeHead(
          server_response.statusCode,
          server_response.headers,
        );
        server_response.on("error", () => {
          console.log(
            "        ERROR |http server response error!",
            server_request.remoteAddress,
            ":",
            server_request.remotePort,
          );
        });
        server_response.pipe(client_response, {
          end: true,
        });
        client_request.pipe(server_request, {
          end: true,
        });
      });
      server_request.on("error", () => {
        console.log(
          "        ERROR |http server request error!",
          server_request.remoteAddress,
          ":",
          server_request.remotePort,
        );
      });
      client_request.on("error", () => {
        console.log(
          "        ERROR |http client request error!",
          client_request.remoteAddress,
          ":",
          client_request.remotePort,
        );
      });
      client_response.on("error", () => {
        console.log(
          "        ERROR |http client response error!",
          client_request.remoteAddress,
          ":",
          client_request.remotePort,
        );
      });
    }
  });

  const proxy_server_listener = proxy_server.listen(temp_port, (error) => {
    if (error) {
      console.log("        ERROR |proxy server listener error!");
    } else {
      const listener_local_ip = proxy_server_listener.address();
      console.log(
        `Nodejs Proxy Server running on port: ${listener_local_ip.port}`,
      );
      console.log("================================================");
      console.log("STATUS", "METHOD", "|URL");
      console.log("================================================");
    }
  });

  proxy_server.on("connect", (request, client_socket) => {
    const { port, hostname } = url.parse(`//${request.url}`, false, true);
    if (hostname && port) {
      const server_socket = net.connect(port, hostname);
      server_socket.on("error", () => {
        console.log(
          "        ERROR   |server socket error!",
          server_socket.remoteAddress,
          ":",
          server_socket.remotePort,
        );
        client_socket.end();
        client_socket.destroy();
      });
      client_socket.on("error", () => {
        console.log(
          "        ERROR   |client socket error!",
          client_socket.remoteAddress,
          ":",
          client_socket.remotePort,
        );
        server_socket.end();
        server_socket.destroy();
      });
      client_socket.on("close", () => {
        server_socket.end();
        server_socket.destroy();
      });
      server_socket.on("close", () => {
        client_socket.end();
        client_socket.destroy();
      });
      server_socket.on("connect", () => {
        console.log("ALLOWED", request.method, `|${hostname}`);
        client_socket.write(
          ["HTTP/1.1 200 Connection Established", "Proxy-agent: zeoxy"].join(
            "\r\n",
          ),
        );
        client_socket.write("\r\n\r\n");
        server_socket.pipe(client_socket, {
          end: true,
        });
        client_socket.pipe(server_socket, {
          end: true,
        });
      });
    } else {
      client_socket.end();
      client_socket.destroy();
    }
  });

  process.on("SIGINT", () => {
    console.log();
    console.log("SIGINT signal received. Closing the server.");
    proxy_server.close((error) => {
      if (error) {
        console.log(error);
        process.exit();
      } else {
        console.log("Closed the server.");
      }
    });
  });
};

try {
  proxy_setup(8080);
} catch (error) {
  console.log(error);
  process.exit();
}
