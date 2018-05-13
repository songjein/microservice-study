const http = require('http');

const url = require('url');
const querystring = require('querystring');

const members = require('./monolithic_members.js');
const goods = require('./monolithic_goods.js');
const purchases = require('./monolithic_purchases.js');

/**
 * 서버 생성 및 요청 처리
 */
var server = http.createServer((req, res) => {
	var method = req.method;
	var uri = url.parse(req.url, true);
	var pathname = uri.pathname;
	/**
	 *	http 는 메서드에 따라 입력 파라미터를 얻어오는 방식 다르다
	 *	POST/PUT은 data와 end 이벤트를 통해 얻을 수 있다
	 *	GET/DELETE는 url 모듈의 parse 기능을 통해 얻을 수 있다
	 */    
	if (method === "POST" || method === "PUT") {
		var body = ""; 

		req.on('data', function (data) {
				body += data;
		});

		req.on('end', function() {
			var params;	

			if (req.headers['content-type'] == "application/json") {
				params = JSON.parse(body);
			} else {
				params = querystring.parse(body);
			}

			onRequest(res, method, pathname, params);
		});

	} else {
		onRequest(res, method, pathname, uri.query);
	}

}).listen(8000);


/**
 *	요청에 대해 모듈별 분기
 *	@param res			response 객체
 *	@param method		메서드 
 *	@param pathname	URI 
 *	@param params		입력 파라미터 
 */
function onRequest(res, method, pathname, params) {
	switch(pathname) {
		case "/members":
			members.onRequest(res, method, pathname, params, response);
			break;
		case "/goods":
			goods.onRequest(res, method, pathname, params, response);
			break;
		case "/purchases":
			purchases.onRequest(res, method, pathname, params, response);
			break;
		default:
			res.writeHead(404);
			return res.end();

	}
}

/**
 *	HTTP 헤더에 JSON 형식으로 응답 
 *	@param res			response 객체
 *	@param params		결과 파라미터 
 */
function response(res, packet) {
	res.writeHead(200, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(packet));
}
