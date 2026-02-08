import { WebSocket, WebSocketServer } from 'ws';
import { randomUUID } from 'crypto';
import express from 'express';
import { Server } from 'http';
import { createServer } from 'https';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();
const server = new Server(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

server.listen(9060);
app.use(express.static('views'));
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/views/index.html');
});

const wss = new WebSocketServer({port: 9061});
var timeOutList: Array<{id: string, timer: any}> = [];
// List with private uuids
var privateList: Array<{id: string, ws: WebSocket, nickname: string, privId: string}> = [];
// List without private uuids
var publicList: Array<{type: string, toId: string, nickname: string}> = [];
// Number after username
var clientIndex: number = 1;

/*                                  */
/* Simple ws.send() functions below */
/*                                  */
// Send a message
function messageFunc(type: string, fromClientUuid: string, nickname: string, message: string, toClientUuid: string) {
	try {
		console.log(message);
		console.log(message.toString());
		var ids: Array<string> = [toClientUuid, fromClientUuid];
		// find fromid in privatelist for ws to send message to,
		// and send yourself and them a message
		for (const i of ids) {
			interface found {id: string; ws: WebSocket; nickname: string; privId: string;}
			const found: found = privateList.find(obj => obj.id === i);
	        var privateListSocket: WebSocket = found.ws;
			if(privateListSocket.readyState === WebSocket.OPEN) {
				console.log("message name: " + nickname);
				privateListSocket.send(JSON.stringify({
					"type": type,
					"fromId": fromClientUuid,
					"nickname": nickname,
					"message": message,
					"toId": toClientUuid
				}));
			};
		};
	} catch (error) {
		console.log(error);
	};
};
// Send array of users
function publicListFunc(type: string, fromClientUuid: string, ws: WebSocket) {
	try {
		const arrayWithoutFromClient = publicList.filter(obj => obj.toId !== fromClientUuid);
		console.log("arrayWithoutFromClient: " + JSON.stringify(arrayWithoutFromClient) );
		console.log("fromClientUuid: " + fromClientUuid);
		ws.send(JSON.stringify({
			"type": type, 
			arrayWithoutFromClient
		}));
	} catch (error) {
		console.log(error);
	};
};
// Generate public uuid
function uuidFunc(type: string, fromClientUuid: string, ws: WebSocket) {
	try {
		ws.send(JSON.stringify({
			"type": type,
			"fromId": fromClientUuid
		}));
	} catch (error) {
		console.log(error);
	};
};
// Generate private uuid
function privUuidFunc(type: string, fromPrivUuid: string, ws: WebSocket) {
	try {
		ws.send(JSON.stringify({
			"type": type,
			"privId": fromPrivUuid
		}));
	} catch (error) {
		console.log(error);
	};
};
// When connecting and to generate a username
function nicknameFunc(type: string, nickname: string, ws: WebSocket) {
	try {
		ws.send(JSON.stringify({
			"type": type,
			"nickname": nickname
		}));
	} catch (error) {
		console.log(error);
	};
};
// When new person joins, broadcast that they joined
function addUserFunc(type: string, fromClientUuid: string, nickname: string) {
	try {
		console.log("test1");
	    for(let i = 0; i < privateList.length; i++) {
	        var privateListSocket: WebSocket = privateList[i].ws;
			console.log("test2");
			console.log("======/=============id " + privateList[i].id);
			// Do not send yourself the "add" user, because you are already on the array
			if (privateList[i].id != fromClientUuid) {
		        if(privateListSocket.readyState === WebSocket.OPEN) {
					privateListSocket.send(JSON.stringify({
						"type": type,
						"toId": fromClientUuid,
						"nickname": nickname
					}));
		        };
			};
	    };
	} catch (error) {
		console.log(error);
	};
};
// When person leaves, broadcast that the person left
function delUserFunc(type: string, fromClientUuid: string, nickname: string) {
	try {
	    for(let i = 0; i < privateList.length; i++) {
	        var privateListSocket: WebSocket = privateList[i].ws;
	        if(privateListSocket.readyState === WebSocket.OPEN) {
				privateListSocket.send(JSON.stringify({
					"type": type,
					"toId": fromClientUuid,
					"nickname": nickname
				}));
	        };
	    };
	} catch (error) {
		console.log(error);
	};
};
/*                                   */
/* End of simple ws.send() functions */
/*                                   */

// Delete from private array
function deleteFromPriv(clientUuid: string) {
	try {
		if (timeOutList.some(obj => obj.id === clientUuid)) {
			console.log("deleted object in privateList array");
			// Remove object from "privateList" array
			// It will be deleted from array in a day
			var index: number = privateList.findIndex(obj => obj.id === clientUuid);
			privateList.splice(index, 1);
		}
	} catch (error) {
		console.log(error);
	};
};

// Check if nickname already exists or not
function checkNickname(funcNickname: string, fromClientUuid: string, fromPrivUuid: string) {
	try {
		console.log("test1");
		var sliceName: string = funcNickname.slice(0, 5);
		var sliceNum: string = funcNickname.slice(5, funcNickname.length);
		// Check if nickname already exists, because we don't want people masquerading others
		if ( !privateList.some(obj => obj.nickname === funcNickname) ) {
			// Check if both public uuid and private uuid exists or not
			if ( privateList.some(obj => obj.id === fromClientUuid) && privateList.some(obj => obj.privId === fromPrivUuid) ) {
				return true;
			}
		// So anybody can use "Guest" + 1-4 digit names
		} else if ( sliceName === "Guest" &&  +sliceNum >= 0 && +sliceNum <= 9999) {
			return true;
		}
	} catch (error) {
		console.log(error);
	};
}

// When changing username show others too if not used
function nicknameChangeFunc(type: string, funcNickname: string, fromClientUuid: string, fromPrivUuid: string) {
	try {
		// Search in array publicList for privId, and change object id nickname to changed one
		interface privateListFrom {id: string; ws: WebSocket; nickname: string; privId: string;}
		var privateListFrom: privateListFrom = privateList.find(obj => obj.privId == fromPrivUuid);
		if (privateListFrom) {
			privateListFrom.nickname = funcNickname;
			console.log("changed: " + typeof privateListFrom);
			console.log("changed: " + typeof privateListFrom.nickname);
		};
		// Search in array publicList for clientId, and change object id nickname to changed one
		interface publicListFrom {type: string; toId: string; nickname: string;}
		var publicListFrom: publicListFrom = publicList.find(obj => obj.toId == fromClientUuid);
		if (publicListFrom) {
			publicListFrom.nickname = funcNickname;
			console.log("changed: " + publicListFrom);
			console.log("changed: " + publicListFrom.nickname);
		};
		// Broadcast to everybody your name has changed
		for(let i = 0; i < publicList.length; i++) {
			// Only send to publicList but get privateList's ws values,
			// because publiclist is for people who are ONLINE, and dont want to send to offline,
			// but publiclist doesn't hold ws values
			interface privateListFrom {id: string; ws: WebSocket; nickname: string; privId: string;}
			var privateListFrom: privateListFrom = privateList.find(obj => obj.id == publicList[i].toId); 
			var privateListSocket: WebSocket = privateListFrom.ws;
			console.log("test2");
			// Do not send yourself the "add" user, because you don't appear on your own publicList
			if (privateListFrom.id != fromClientUuid) {
				if(privateListSocket.readyState === WebSocket.OPEN) {
					privateListSocket.send(JSON.stringify({
						"type": type,
						"toId": fromClientUuid,
						"nickname": funcNickname
					}));
					console.log("changed user from: " + " to: " + funcNickname);
				}
			}
		}
	} catch (error) {
		console.log(error);
	};
};

// Check if client array has an object matching the values given to its own values
function privateListCheck(index: number, objId: string, data: string) {
	try {
		if (index > -1) {
			if (objId === "nickname") {
				if (privateList[index].nickname = data) {
					console.log("true nickname: " + privateList[index].nickname + " " + data);
					return true;
				} else {
					console.log("false nickname: " + privateList[index].nickname + " " + data);
					return false;
				};
			} else if (objId === "id") {
				if (privateList[index].id = data) {
					console.log("true fromId: " + privateList[index].id + " " + data);
					return true;
				} else {
					console.log("false fromId: " + privateList[index].id + " " + data);
					return false;
				};
			} else {
				return false;
			};
		} else {
			return false;
		}
	} catch (error) {
		console.log(error);
	}
}

// Websocket connection
wss.on('connection', function(ws: WebSocket) {
	try {
		var fromClientUuid: string = randomUUID();
		var timer: any = 0;
		// - Below line is for debugging purposes
		// fromClientUuid = "3530ed8f-155b-47da-8478-e76ea55d8e68"
		var fromPrivUuid: string = randomUUID();
		var randNum: number = Math.floor( Math.random() * (10000 - 0 + 1) ) + 0;
		var nickname: string = "Guest" + randNum;
		//var nickname: string = "test";
		clientIndex += 1;
		console.log("On Connection Client UUID: " + fromClientUuid);
		console.log('client [%s] connected', fromClientUuid);
		// It's if they have multiple tabs open, 
		// to not delete them off when the close the extra tab(s)
		var publicListStillConnected: boolean = false;
		// Only allow add yourself once
		var yourAddOnce: boolean = false;

		// Websocket when it recieves a message
		ws.on('message', function(message: string) {
			try {
				var data = JSON.parse(message.toString());
				// - From you to send another single user
				switch (data.type) {
					case "message":
						interface found {id: string; ws: WebSocket; nickname: string; privId: string;}
						const found: found = privateList.find(obj => obj.id === fromClientUuid);
						var privateListSocket: WebSocket = found.ws;
						//console.log("==========////////////privateListSocket: ", privateListSocket);
						/*interface found {id: string; ws: WebSocket; nickname: string; privId: string;}
						const found: found = privateList.find(obj => obj.id === fromClientUuid);
						var privateListSocket: WebSocket = found.ws;
						console.log(privateListSocket);*/





						console.log("message", data.message, data.toId);
						console.log("before message name: " + nickname);
						if (!privateList.some(obj => obj.id === data.toId) && data.toId !== undefined) {
							ws.send(JSON.stringify({ "type": "userDeleted" }));
						} else if (!publicList.some(obj => obj.toId === data.toId) && data.toId !== undefined) {
							ws.send(JSON.stringify({ "type": "notAvailable" }));
						} else if (data.toId !== undefined) {
							messageFunc("message", fromClientUuid, nickname, data.message, data.toId);
							console.log("message", fromClientUuid, nickname, data.message, data.toId);
						} else {
							ws.send(JSON.stringify({ "type": "notSelected" }));
							console.log("Undefined toId, so not sending");
						}
						break;
					// - Broadcast
					case "nicknameChange":
						// check if nickname is already used or not
						if (checkNickname(data.nickname, data.fromId, data.privId) == true) {
							nicknameChangeFunc("nicknameChange", data.nickname, data.fromId, data.privId);
							nickname = data.nickname;
							console.log("Change nickname: " + data.nickname);
						} else {
							console.log("nickname already exists");
						}
						break;
					// - Send to yourself
					case "userlist":
						publicListFunc("userlist", fromClientUuid, ws);
						break;
					// - Send to yourself
					case "uuid":
						// - If data had no fromId at all, just the type
						uuidFunc("uuid", fromClientUuid, ws);
						break;
					// - Send to yourself
					case "privUuid":
						// - If data had no privUuid at all, just the type
						privUuidFunc("privUuid", fromPrivUuid, ws);
						break;
					// - Send to yourself
					case "nickname":
						// - If data had no nickname at all, just the type
						// - Generate a nickname
						nicknameFunc("nickname", nickname, ws);
						break;
					case "add":
						// Only allow to add once
						if (yourAddOnce === false) {
							// Add object to "privateList" array
							privateList.push({"id": fromClientUuid, "ws": ws, "nickname": nickname, "privId": fromPrivUuid});
							// Add object to "publicList" array
							publicList.push({"type": "userlist", "toId": fromClientUuid, "nickname": nickname});
							addUserFunc("adduser", fromClientUuid, nickname);
						};
						break;
					case "cookie":
						// Only allow to add once
						if (yourAddOnce === false) {
							// - If privateList includes data.priv/username/clientId
							console.log("index: " + index);
							for(let i = 0; i < privateList.length; i++) {
								console.log("CLIENT: " + privateList[i].id);
							};
							for(let i = 0; i < publicList.length; i++) {
								console.log("publicList: " + publicList[i].toId);
							};
							// - Check if user uuid is already connected, if so
							// then disallow them from connecting, because
							// it causes duplicate localStorage values
							if (publicList.some(obj => obj.toId === data.fromId)) {
								ws.send(JSON.stringify({ "type": "alreadyConnected" }));
								publicListStillConnected = true;
								ws.close();
								console.warn("You are already connected on a different device");
							} else {
								var index: number = privateList.findIndex(e => e.privId === data.privId); // [index][3]
								console.log("fromId: " + data.fromId + " nickname: " + data.nickname);
								// If they have proper correct ids, and still exists in privateList
								if (privateListCheck(index, "id", data.fromId) === true && privateListCheck(index, "nickname", data.nickname) === true) {
									fromPrivUuid = data.privId;
									fromClientUuid = data.fromId;
									nickname = data.nickname;
									// - Remove object in "privateList" array
									var index: number = privateList.findIndex(obj => obj.id === fromClientUuid);
									privateList.splice(index, 1);
									// - Add object to "privateList" array
									privateList.push({"id": fromClientUuid, "ws": ws, "nickname": nickname, "privId": fromPrivUuid});
									// - Add object to "publicList" array
									publicList.push({"type": "userlist", "toId": fromClientUuid, "nickname": nickname});
									// - Add to others who are connected publicList
									console.log("-----------" + fromPrivUuid + " " + fromClientUuid + " " + nickname);
									addUserFunc("adduser", fromClientUuid, nickname);
									for(let i = 0; i < privateList.length; i++) {
										console.log("NEW CLIENT: " + privateList[i].id);
									};
									for(let i = 0; i < publicList.length; i++) {
										console.log("NEW publicList: " + publicList[i].toId);
									};

									// Remove object from "timeOutList" array and stop timeout
									var index: number = timeOutList.findIndex(obj => obj.id === fromClientUuid);
									interface found {id: string; timer: any;};
									const found: found = timeOutList.find(obj => obj.id === fromClientUuid);
									console.log("before=======timer: " + found.timer);
									/*timeOutList.forEach(function (obj) {
										console.log("id: " + obj.id + " timer: " + obj.timer);
									});*/
									clearTimeout(found.timer);
									timeOutList.splice(index, 1);
									console.log("=======timer: " + found.timer);
									/*timeOutList.forEach(function (obj) {
										console.log("id: " + obj.id + " timer: " + obj.timer);
									});*/
								// - If data does not exist in array publicList,
								// generate a new priv and clientId
								} else {
									uuidFunc("uuid", fromClientUuid, ws);
									privUuidFunc("privUuid", fromPrivUuid, ws);
									// - data.nickname does not exist in privateList array
									if (!privateList.some(e => e.nickname === data.nickname)) {
										// Keep the sent cookie's nickname
										nickname = data.nickname;
									} else {
										nicknameFunc("nickname", nickname, ws);
									};
									// Add object to "privateList" array
									privateList.push({"id": fromClientUuid, "ws": ws, "nickname": nickname, "privId": fromPrivUuid});
									// Add object to "publicList" array
									publicList.push({"type": "userlist", "toId": fromClientUuid, "nickname": nickname});
									// Add to others who are connected publicList
									addUserFunc("adduser", fromClientUuid, nickname);
								};
							};
						};
						break;
				};
			} catch (error) {
				console.log(error);
			};
		});

		// Websocket when it recieves a close signal
		ws.on('close', function() {
			try {
				// If sent cookie but publicList object still connected, this will be true
				if (publicListStillConnected === false) {
					// - If somebody that was connected left, broadcast to everybody connected
					// Broadcast connected toprivateList to delete closed fromClient
					delUserFunc("deluser", fromClientUuid, nickname);

					// Remove object from "publicList" array
					var index: number = publicList.findIndex(obj => obj.toId === fromClientUuid);
					publicList.splice(index, 1);
					
					// Timer for a day; 86400000
					console.log("cancel test: ");
					
					//var timer = setTimeout(deleteFromPriv, 10000, fromClientUuid)
					//let timer = setTimeout(deleteFromPriv, 2000, fromClientUuid)
					let timer = setTimeout(deleteFromPriv, 2000, fromClientUuid);
					console.log("=================timer: " + timer);
					console.log("=================timer: " + timer);
					console.log("=================timer: " + timer);
					console.log("=================timer: " + timer);
					timeOutList.push( {"id": fromClientUuid, "timer": timer} );
				} else {
					console.log("publicListStillConnected is true");
				};
			} catch (error) {
				console.log(error);
			};
		});
	} catch (error) {
		console.log(error);
	};
});
