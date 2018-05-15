'use strict';
const http = require('http');
const url = require('url');
const querystring = require('querystring');

const tcpClient = require('./client');

var mapClients = {};	// tcp client 객체와 관련 정보를 저장
var mapUrls = {};			// 처리가능한 url에 붙어있는 tcp client를 거꾸로 얻기 위함
var mapResponse = {};	// 마이크로서비스로부터 응답을 얻어 오기 전 http res 객체를 임시로 저장해 놓는 곳
var mapRR = {};				// 라운드 로빈을 위한 맵
var index = 0;

var GATEWAY_PORT = 3000;

var server = http.createServer((req, res) => {
	var method = req.method;
	var uri = url.parse(req.url, true);
	var pathname = uri.pathname;
	
	// method 마다 파라미터 읽는 방식이 다르기 때문에 분기
	if (method === "POST" || method === "PUT") {
		var body = "";	

		req.on('data', function (data) {
			body += data;	
		});

		req.on('end', function (data) {
			var params;
			if (req.headers['content-type'] == 'application/json') {
				params = JSON.parse(body);	
			} else {
				params = querystring.parse(body);	
			}
			onRequest(res, method, pathname, params);
		});

	} else {
		// GET or DELETE
		onRequest(res, method, pathname, uri.query);	
	}

}).listen(GATEWAY_PORT, () => {
	/**
	 *	게이트웨이 서버가 실제로 켜지면, 
	 *	distributor로 부터 마이크로서비스 목록을 받아옴
	 */
	console.log("listen", server.address());

	// distributor 등록 패킷
	var packet = {
		uri:  "/distributes",
		method: "POST",
		key: 0,
		params: {
			port: GATEWAY_PORT,
			name: "gate",
			urls: []
		}
	};
	var isConnectedDistributor = false;

	// distributor 접속용 Client 클래스 인스턴스
	this.clientDistributor = new tcpClient(
		"127.0.0.1"
		, 9000
		, (options) => {	// distributor 접속 event
			isConnectedDistributor = true;
			this.clientDistributor.write(packet);
		}
		, (options, data) => { onDistribute(data); }				// distributor 데이터 수신 event
		, (options) => { isConnectedDistributor = false; }	// distributor 접속 종료 event
		, (options) => { isConnectedDistributor = false; }	// distributor 에러 event
	);

	// 주기적으로 접속 확인
	setInterval(() => {
		if (isConnectedDistributor != true) {
			this.clientDistributor.connect();	
		}	
	}, 3000);
});


/** 
 *	http request가 왔을 때,
 *	API 호출 처리를 담당
 */
function onRequest (res, method, pathname, params) {
	var key = method + pathname;
	var client = mapUrls[key];
	if (client == null) {
		res.writeHead(404);	
		res.end();
		return;
	} else {
		// API 호출에 대한 고유키 발급
		params.key = index;
		var packet = {
			uri: pathname,
			method: method,
			params: params
		};

		// 마이크로서비스로 요청을 하기 전에 res 객체를 기록한 뒤
		// 응답이 왔을 때(key가 그대로 되돌아옴) res를 되찾아 이용해서 최종 전달을 한다
		mapResponse[index] = res;
		index ++;

		if (mapRR[key] == null)
			mapRR[key] = 0;
		mapRR[key] ++;
		// 마이크로서비스에 요청 (응답은 onReadClient로)
		// 같은 서비스를 수행하는 노드가 여러개 일 수 있으니까
		// 라운드 로빈을 수행한다
		client[mapRR[key] % client.length].write(packet);
	}
}


/**
 *	distributor 데이터(현재 접속 가능한 마이크로서비스 목록) 수신 처리
 */
function onDistribute(data) {
	for (var n in data.params) {
		/**
		 *	헷갈림 주의	
		 *	distributer.js 에서 sendInfo 호출시 distributor와 연결 되어있는 (map에 저장되어 있는) 
		 *	client 들의 'info'를(server.js의 context {port,name,urls} 정보 + host) 모아서 보낸다
		 */
		var node = data.params[n];	
		var key = node.host + ":" + node.port;
		// 접속하지 않은 마이크로서비스인 경우에만 연결은 맺는다
		if (mapClients[key] == null && node.name != "gate") {
			// 해당 정보로 마이크로서비스에 직접 연결 맺어 놓기
			var client = new tcpClient(
				node.host, node.port
				, onCreateClient,	onReadClient, onEndClient, onErrorClient);
			
			// mapClients에 생성된 connection (client) 및 서버의 정보(info)를 저장해놓음
			mapClients[key] = {
				client: client,
				info: node
			};

			// mapUrls에는 처리가능한 Url 들에 대해 거꾸로 client의 connection을 매핑 시켜놓는다
			for (var m in node.urls) {
				var key = node.urls[m];	
				if (mapUrls[key] == null) {
					mapUrls[key] = [];	
				}
				mapUrls[key].push(client);
			}

			client.connect();
		}
	}	
}


function onCreateClient(options) {
	console.log("onCreateClient");
}


/**
 *	onRequest 이후 	
 *	마이크로서비스로부터 응답이 왔을 때
 */
function onReadClient(options, packet) {
	console.log("onReadClient", packet);
	mapResponse[packet.key].writeHead(200, { 'Content-Type': 'application/json' });
	mapResponse[packet.key].end(JSON.stringify(packet));
	delete mapResponse[packet.key];
}


/**
 *	마이크로서비스 접속 종료 처리
 */
function onEndClient(options) {
	var key = options.host + ":" + options.port;
	console.log("onEndClient", mapClients[key]);
	for (var n in mapClients[key].info.urls) {
		var node = mapClients[key].info.urls[n];
		delete mapUrls[node];
	}
	delete mapClients[key];
}

/**
 *	마이크로서비스 접속 에러 처리
 */
function onErrorClient(options) {
	console.log("onErrorClient");
}
