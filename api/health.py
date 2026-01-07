from http.server import BaseHTTPRequestHandler
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from baidu_map_api import BaiduMapAPI
    baidu_map_configured = True
except:
    baidu_map_configured = False

try:
    from deepseek_api import DeepSeekAPI
    deepseek_configured = True
except:
    deepseek_configured = False

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({
            'status': 'ok',
            'baidu_map_configured': baidu_map_configured,
            'deepseek_configured': deepseek_configured
        }).encode())

