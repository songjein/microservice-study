'use strict'

// 노드 접속 관리 오브젝트
var map = {};

class distributor extends require('./server.js') {
	constructor() {
		// Server 클래스의 생성자 (urls는 처리가능한 프로토콜 정보이다)
		super("distributor", 9000, ["POST/distributes", "GET/distributes"]);
	}


	// 노드 접속 이벤트 처리
	onCreate(socket) {
		console.log("onCreate", socket.remoteAddress, socket.remotePort);	
		this.sendInfo(socket);
	}


	// 접속 해제 이벤트 처리
	onClose(socket) {
		var key = socket.remoteAddress + ":" + socket.remotePort;	
		console.log("onClose", socket.remoteAddress, socket.remotePort);
		delete map[key];
		this.sendInfo();
	}


	// 데이터 수신 및 노드 등록
	onRead(socket, json) {
		var key = socket.remoteAddress + ":" + socket.remotePort;	
		console.log("onRead", socket.remoteAddress, socket.remotePort, json);

		if (json.uri == "/distributes" && json.method == "POST") {
			map[key] = {
				socket: socket	
			};		
			map[key].info = json.params;
			map[key].info.host = socket.remoteAddress;
			this.sendInfo();
		}
	}
	

	// 패킷 전송
	write(socket, packet) {
		socket.write(JSON.stringify(packet) + "¶");	
	}

	
	// 노드 접속 정보 전파
	sendInfo(socket) {
		var packet = {
			uri: "distributes",
			method: "GET",
			key: 0, 
			params: []
		};	

		for (var n in map) {
			packet.params.push(map[n].info);	
		}

		if (socket) {
			this.write(socket, packet);	
		} else {
			for (var n in map) {
				this.write(map[n].socket, packet);	
			}	
		}
	}
}

new distributor();
