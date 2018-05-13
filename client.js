'use strict';

const net = require('net');

/**
 *	클라이언트의 기본 기능 구현
 *	접속'connect', 발송'write'
 *	수신은 수신 완료시 생성자에 전달한 함수로 콜백
 */
class tcpClient {
	constructor(host, port, onCreate, onRead, onEnd, onError){
		this.options = {
			host: host,
			port: port
		};
		this.onCreate = onCreate;	// 접속 완료 콜백 
		this.onRead = onRead;	// 데이터 수신 콜백
		this.onEnd = onEnd;	// 접속 종료 콜백
		this.onError = onError;	// 에러 발생 콜백
	}

	connect() {
		this.client = net.connect(this.options, () => {
			if (this.onCreate)
				this.onCreate(this.options);	// 접속 완료 이벤트 콜백
		});

		// 데이터 수신 처리
		this.client.on('data', (data) => {
			var sz = this.merge ? this.merge + data.toString() : data.toString();	
			var arr = sz.split('¶');
			for (var n in arr) {
				if (sz.charAt(sz.length - 1) != '¶' && n == arr.length - 1) {
					this.merge = arr[n];
					break;
				}	else if (arr[n] == "") {
					break;	
				} else {
					this.onRead(this.options, JSON.parse(arr[n]));	
				}
			}
		});

		// 접속 종료 처리
		this.client.on('close', () => {
			if (this.onEnd)
				this.onEnd(this.options);
		});

		// 에러 발생 처리
		this.client.on('error', (err) => {
			if (this.onError)
				this.onError(this.options, err);
		});
	}

	write(packet) {
		this.client.write(JSON.stringify(packet) + "¶");	
	}
}

module.exports = tcpClient;


