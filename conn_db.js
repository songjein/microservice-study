const mysql = require('mysql');
const conn = {
	host: 'stdio.cqadge8skvwi.ap-northeast-2.rds.amazonaws.com',
	user: 'micro',
	password: 'service',
	database: 'monolithic'
};

var connection = mysql.createConnection(conn);
connection.connect();
connection.query("show databases;", (error, results, fields) => {
	// 결과 처리
	console.log(results);
});
connection.end();
