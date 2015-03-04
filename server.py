import SimpleHTTPServer
import SocketServer
 
PORT = 9001
 
Handler = SimpleHTTPServer.SimpleHTTPRequestHandler
 
httpd = SocketServer.TCPServer(("", PORT), Handler)
 
print "Server running on port ", PORT
httpd.serve_forever()