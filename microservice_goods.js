'use strict';

const cluster = require('cluster');
const business = require('./monolithic_goods.js');

class goods extends require('./server.js') {
	constructor() {
		super("goods"
			, process.argv[2] ? Number(process.argv[2]) : 9010
			, ["POST/goods", "GET/goods", "DELETE/goods"]
			);

		// 일반적으로는 주소와 포트번호는 setting 파일을 별도로 두어  관리한다
		this.connectToDistributor("127.0.0.1", 9000, (data) => {
			console.log("Distributor Notification", data);
		});
	}
	
	// 패킷이 들어왔을 경우 onRead 호출 (비즈니스 로직)
	onRead(socket, data) {
		console.log("onRead", socket.remoteAddress, socket.remotePort, data);	
		business.onRequest(socket, data.method, data.uri, data.params, (s, packet) => {
			socket.write(JSON.stringify(packet) + '¶');	
		});
	}
}

if (cluster.isMaster) {
	cluster.fork();
	cluster.on('exit', (worker, code, signal) => {
		console.log(`worker ${worker.process.pid} died`);	
		cluster.fork();	// 새로운 자식프로세스 실행!
	});
} else {
	new goods();
}
