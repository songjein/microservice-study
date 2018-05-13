const mysql = require('mysql');
const conn = {
	host: 'stdio.cqadge8skvwi.ap-northeast-2.rds.amazonaws.com',
	user: 'micro',
	password: 'service',
	database: 'monolithic'
};


// monolithic.js 에서 이 파일의 onRequest를 호출하려면 exports를 해야함
exports.onRequest = function (res, method, pathname, params, cb) {
	// 기능별 분기
	switch(method) {
		case "POST":
			return register(method, pathname, params, (response) => {
				process.nextTick(cb, res, response);
			});
		case "GET":
			return inquiry(method, pathname, params, (response) => {
				process.nextTick(cb, res, response);
			});
		case "DELETE":
			return unregister(method, pathname, params, (response) => {
				process.nextTick(cb, res, response);
			});
		default:
			return process.nextTick(cb, res, null);
	}
}

/**
 * 상품 등록
 * @param	method		메서드
 * @param	pathname	URI
 * @param	params 		입력 파라미터
 * @param	cb				콜백
 */
function register(method, pathname, params, cb) {
	var response = {
		key: params.key,
		errorcode: 0,
		errormessage: "success"
	};

	if (params.name == null || params.category == null || params.price == null || params.description == null){
		// 유효성 검사 
		response.errorcode = 1;
		response.errormessage = "Invalid Parameters";
		cb(response);

	} else {
		// 저장
		var connection = mysql.createConnection(conn);
		connection.connect();
		connection.query(
			"insert into goods(name, category, price, description) values(?, ?, ?, ?)"
			,[params.name, params.category, params.price, params.description]
			,(error, results, fields) => {
				if (error) {
					response.errorcode = 1;
					response.errormessage = error;
				}
				cb(response);
			});
		connection.end();
	}
}


/**
 * 상품 조회 
 * @param	method		메서드
 * @param	pathname	URI
 * @param	params 		입력 파라미터
 * @param	cb				콜백
 */
function inquiry(method, pathname, params, cb) {
	var response = {
		key: params.key,
		errorcode: 0,
		errormessage: "success"
	};
	
	var connection = mysql.createConnection(conn);
	connection.connect();
	connection.query("select * from goods", (error, results, fields) => {
		if (error || results.length == 0) {
			response.errorcode = 1;
			response.errormessage = error ? error : "no data";

		} else {
			response.results = results;
		}
		cb(response);
	});
	connection.end();
}


/**
 * 상품 삭제 
 * @param	method		메서드
 * @param	pathname	URI
 * @param	params 		입력 파라미터
 * @param	cb				콜백
 */
function unregister(method, pathname, params, cb) {
	var response = {
		key: params.key,
		errorcode: 0,
		errormessage: "success"
	};

	if (params.id == null) {
		response.errorcode = 1;
		response.errormessage = "Invalid Parameters";
		cb(response);

	} else {
		var connection = mysql.createConnection(conn);
		connection.connect();
		connection.query(
			"delete from goods where id = ?"
			, [params.id]
			, (error, results, fields) => {
				if (error) {
					response.errorcode = 1;
					response.errormessage = error;
				}
				cb(response);
			});
		connection.end();
	}
}

