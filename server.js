'use strict';

const net = require('net');
const tcpClient = require('./client.js');

/**
 *	서버의 기본 기능 구현
 *	리슨, 데이터 수신, 클라이언트 접속 관리
 *	+ Distributor에 주기접 접속 시도
 */
class tcpServer {
	constructor(name, port, urls) {
		this.context = {
			port: port,
			name: name,
			urls: urls
		};	
		this.merge = {};

		// 서버 생성
		this.server = net.createServer((socket) => {
			// 클라이언트 접속 이벤트 처리
			this.onCreate(socket);	

			// 에러 이벤트 처리
			socket.on('error', (exception) => {
				this.onClose(socket);	
			});

			// 클라이언트 접속 종료 이벤트 처리
			socket.on('close', () => {
				this.onClose(socket);	
			});

			// 데이터 수신 처리
			socket.on('data', (data) => {
				var key = socket.remoteAddress + ":" + socket.remotePort;	
				var sz = this.merge[key] ? this.merge[key] + data.toString() : data.toString();
				var arr = sz.split("¶");
				for (var n in arr) {
					if (sz.charAt(sz.length - 1) != '¶' && n == arr.length - 1) {
						this.merge[key] = arr[n];	
						break;
					} else if (arr[n] == "") {
						break;	
					} else {
						this.onRead(socket, JSON.parse(arr[n]));	
					}
				}
			});
		});

		// 서버 객체 에러 처리 (포트 충돌 등)
		this.server.on('error', (err) => {
			console.log(err);	
		});

		// 리슨
		this.server.listen(port, () => {
			console.log('listen', this.server.address());	
		});
	}


	onCreate(socket) {
		console.log("onCreate", socket.remoteAddress, socket.remotePort);	
	}


	onRead(socket) {
		console.log("onRead", socket.remoteAddress, socket.remotePort);	
	}


	onClose(socket) {
		console.log("onClose", socket.remoteAddress, socket.remotePort);	
	}

	/**	
	 *	Distributor 접속 함수
	 *	@param onNoti	Distributor에 접속했을 때 콜백받을 함수
	 */
	connectToDistributor(host, port, onNoti) {
		// Distributor에 전달할 패킷 
		var packet = {
			uri: "/distributes",
			method: "POST",
			key: 0,
			params: this.context
		};

		var isConnectedDistributor = false;										// Distributor 접속 상태

		this.clientDistributor = new tcpClient(								// Client 인스턴스 생성
			host
			, port
			, (option) => {																			// 접속 이벤트
				isConnectedDistributor = true;
				this.clientDistributor.write(packet);
			}
			, (options, data) => { onNoti(data); }							// 데이터 수신 이벤트
			, (options) => { isConnectedDistributor = false; }	// 접속 종료 이벤트 
			, (options) => { isConnectedDistributor = false; }	// error 이벤트 
		);

		setInterval(() => {																		// 주기적인 접속 시도
			if (isConnectedDistributor != true) {
				this.clientDistributor.connect();	
			}	
		}, 3000);
	}

}

module.exports = tcpServer;
