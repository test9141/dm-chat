// - Doing any testing or debugging requires TWO browsers, 
// because otherwise they share the same localstorage and cookies
window.onload = function() {
	var ws = new WebSocket("ws://localhost:9061");
	var toId;
	var fromId;
	var privId;
	var nickname = "";
	var yourNickname = "";
	var users = 0;
	var debug;
	var usernameInputEle = document.getElementById('username');
	var chatForm = document.getElementById("chat-form");
	var sendButton = document.getElementById("send");

	/*                              */
	/* Functions with HTML involved */
	/*                              */
	// - If username changes, also broadcast to others that it changed too
	// - It is an event listener that continuously checks for input
	usernameInputEle.addEventListener('input', function(event) {
		yourNickname = usernameInputEle.value;
		changeFromNickname();
		console.log("yourNickname: " + yourNickname);
		saveCookie("name=", yourNickname);
	});
	// Message text box event listener when press enter
	chatForm.addEventListener('keypress', function (e) {
		if (e.key === 'Enter') {
			// code for enter
			sendMessage();
		}
	});
	// Send button event listener when clicked
	sendButton.addEventListener('click', () => {
		sendMessage();
	});
	// Give text to create a new html element
	function appendMessage(otherId, nickname, message) {
		console.log("appendmessage: " + toId);
		// Must be when you click a username, you will see messages appear then
		if ( (toId == null || toId == undefined || toId !== otherId) && (otherId !== "client") ) {
			console.warn("null - toId: " + toId + " otherId: " + otherId);
		} else {
			console.warn("message passed");
			var messagesEle = document.getElementById('messages');
			var messagesListEle = document.createElement("li");
			messagesListEle.textContent = nickname + ": " + message;
			messagesListEle.id = "textmsg";
			messagesEle.appendChild(messagesListEle);
		};
	}
	// Show a "no users" message when there are no users
	function appendNoUserlist() {
		var nobodyTextEle = "<h3>" + "nobody is here" + "</h3>";
		var usersEle = document.getElementById('users');
		var createUserListEle = document.createElement("li");
		createUserListEle.innerHTML = nobodyTextEle;
		usersEle.appendChild(createUserListEle);
		//console.log("no userlist");
	}
	// Delete the no users message when there is somebody
	function deleteNoUserlist() {
		var allListsEle = document.querySelectorAll('li');
		var nobodyTextEle = "<h3>" + "nobody is here" + "</h3>";
		var targetElement = Array.from(allListsEle).find(el => el.innerHTML === nobodyTextEle);
		targetElement.remove();
	}
	// Add a singular new user to left pane
	function addUser(nickname, dataToId, fromId) {
		// Click to get uuid
		var createUserListEle = document.createElement("li");
		//console.log("event listener: " + dataToId);
		createUserListEle.addEventListener("click", () => {
			// setup your id for others
			toId = dataToId;
			console.log("clicked toId: " + toId);
			// clear message array then show up array from local storage
			var clearAll = document.querySelectorAll("#textmsg");
			clearAll.forEach(e => e.remove());
			console.warn(dataToId + "=" + fromId);
			var getMessages = readStorage(dataToId + "=" + fromId);
			// if getMessages array does not exist yet, because nobody messaged
			if (getMessages != null) {
				// Append array of messages from local storage
				var parsedMessages = getMessages;
				for (var i = 0; i < parsedMessages.length; i++) {
					console.log("in for loop now");
					appendMessage(toId, parsedMessages[i].username, parsedMessages[i].message);
				}
				console.warn("yes: " + getMessages);
				console.warn("check: " + parsedMessages.length);
			}
		});
		//console.log("end");
		var usersEle = document.getElementById('users');
		createUserListEle.textContent = nickname;
		createUserListEle.style = "cursor: pointer;";
		createUserListEle.id = dataToId;
		usersEle.appendChild(createUserListEle);
		//console.log("adding");
	}
	// Delete a singular user when they left on the left pane
	function delUser(nickname, dataToId) {
		var targetElement = document.getElementById(dataToId);
		targetElement.remove();
		//console.log("delete");
	}
	// When somebody changes their username, you will reflect it
	// with this function and see change on left pane
	function changeToNickname(nickname, toId) {
		var name = document.getElementById(toId);
		//console.log(name);
		//console.log(name.textContent);
		name.textContent = nickname;
		//console.log(name.innerHTML);
	}
	// When you send message in message box, send your information and message
	function sendMessage() {
		try {
			var messageInputEle = document.getElementById('message');
			console.log(messageInputEle.value);
			if(ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({
					type: "message",
					message: messageInputEle.value,
					toId: toId
				}));
				console.log("SENDING MESSAGE: " + messageInputEle.value);
			}
			messageInputEle.value = '';
			messageInputEle.focus();

			console.log("DEBUG: " + toId + " " + fromId);
		} catch (error) {
			console.warn(error);
		}
	}
	/*                                     */
	/* End of functions with HTML involved */
	/*                                     */

	// Change your own username
	function changeFromNickname() {
		if(ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify({
				type: "nicknameChange",
				fromId: fromId,
				nickname: yourNickname,
				privId: privId
			}));
			//console.log("CHANGING NAME: " + yourNickname);
		}
	}

	// Get cookie value
	function getCookie(name) {
		const value = `; ${document.cookie}`;
		const parts = value.split(`; ${name}=`);
		if (parts.length === 2) return parts.pop().split(';').shift();
	}

	// Save cookie
	function saveCookie(id, value) {
		// Comment below for debugging
		document.cookie = id + value;
	}

	// - To remember an array of JSON messages, store in local storage
	// - Warning / TODO: If you have multiple tabs, this will make
	// duplicate messages in the localStorage.
	function saveStorage(toUuid, message, username) {
		console.log("Checker: " + toUuid + " " + message);
		debug = toUuid;

		// if no localstorage for item exists
		if (localStorage.getItem(toUuid + "=" + fromId) === null) {
			var array = new Array();
			array.push( {username, message} );
			localStorage.setItem(toUuid + "=" + fromId, JSON.stringify(array));
			console.log("Null");
		} else {
			// Add message on top of array
			var array = localStorage.getItem(toUuid + "=" + fromId);
			var parsedArray = JSON.parse(array);
			parsedArray.push( {username, message} );
			localStorage.setItem(toUuid + "=" + fromId, JSON.stringify(parsedArray));
			console.log("Not null");
		};

		// Print to console that cookie is saved
		console.warn("Checking: " + window.name);
		console.log("Storage saved! name: " + toUuid + " value: " +  message);
		console.log("Storage: " + toUuid + " " + localStorage.getItem(toUuid + "=" + fromId));
		console.warn("original: " + toUuid + "=" + fromId);
	};

	// Get the JSON message + name array data from local storage
	function readStorage(name) {
		var getter = localStorage.getItem(name);
		var parsedGetter = JSON.parse(getter);
		// Print to console that local storage is read
		console.log("Storage read! name: " + name + " value: " + parsedGetter + getter);
		return parsedGetter;
	};

	// When websocket is open
	ws.onopen = function(e) {
		//console.log('Connection to server opened');

		// Check if username is already stored in a cookie
		// And also setup things with username, fromId and privId
		if (document.cookie) {
			var usernameInputEle = document.getElementById('username');
			//console.log("Cookie name: " + getCookie("name"));
			usernameInputEle.setAttribute('value', getCookie("name"));
			yourNickname = getCookie("name");
			fromId = getCookie("fromId");
			privId = getCookie("privId");
			ws.send(JSON.stringify({
						type: "cookie",
						fromId: fromId,
						privId: privId,
						nickname: yourNickname
					}));
			ws.send(JSON.stringify( {type: "userlist"} ));
		} else {
			//console.log("testing");
			ws.send(JSON.stringify( {type: "uuid"} ));
			ws.send(JSON.stringify( {type: "privUuid"} ));
			ws.send(JSON.stringify( {type: "nickname"} ));
			ws.send(JSON.stringify( {type: "add"} ));
			ws.send(JSON.stringify( {type: "userlist"} ));
		};
	};

	// When websocket sends you a message
	ws.onmessage = function(msg) {
		var data = JSON.parse(msg.data);

		// - For loading userlist 
		// - Check if it is an array; for userlist, which is whole list of users
		switch (data.type) {
			case "userlist":
				console.log("test");
				// if more than one object exists in array
				if (Object.keys(data.arrayWithoutFromClient).length > 0) {
					console.log("test2");
					if (data.arrayWithoutFromClient[0].type == "userlist") {
						console.log("test3");
						for (let i = 0; i < Object.keys(data.arrayWithoutFromClient).length; i++) {
							console.log("test4");
							users += 1;
							let obj = data.arrayWithoutFromClient[i];
							addUser(obj.nickname, obj.toId, fromId);
							//console.log("ID: [%s] = %s", obj.toId, obj.nickname);
						};
					};
				} else if (Object.keys(data.arrayWithoutFromClient).length == 0) {
					//console.log("no userlist");
					appendNoUserlist();
				};
				break;
			// At start, get your own public uuid from server
			case "uuid":
				fromId = data.fromId;
				saveCookie("fromId=", data.fromId);
				break;
			// At start, get your own private uuid from server
			case "privUuid":
				privId = data.privId;
				saveCookie("privId=", data.privId);
				break;
			// Set default username
			case "nickname":
				yourNickname = data.nickname;
				var usernameInputEle = document.getElementById('username');
				usernameInputEle.value = yourNickname;
				saveCookie("name=", data.nickname);
				break;
			// Add single user
			case "adduser":
				users += 1;
				addUser(data.nickname, data.toId, fromId);
				// Remove "nobody is here" text if one user exists
				if (users == 1) {
					deleteNoUserlist();
				}
				break;
			// Delete single user
			case "deluser":
				users -= 1;
				delUser(data.nickname, data.toId);
				// Add "nobody is here" text
				if (users == 0) {
					appendNoUserlist();
				}
				break;
			// Load a message
			case "message":
				// Need to differentiate when they send message to you,
				// so it will show message and store in the right array
				if (data.toId == fromId) {
					appendMessage(data.fromId, data.nickname, data.message);
					saveStorage(data.fromId, data.message, data.nickname);
				} else {
					appendMessage(data.toId, data.nickname, data.message);
					saveStorage(data.toId, data.message, data.nickname);
				}
				console.log("type: " + data.type + " fromId: " + data.fromId + " nickname: " + data.nickname + " message " + data.message + " toId " + data.toId);
				break;
			// Change other person's username to reflect change
			case "nicknameChange":
				// Change element with class=data.toId innerHTML to data.nickname
				changeToNickname(data.nickname, data.toId);
				break;
			// - Log when you get websocket closed from server
			// because of you being already connected
			case "alreadyConnected":
				appendMessage("client", "Client", "You are already connected on another browser/tab");
				break;
			case "notAvailable":
				appendMessage("client", "Client", "This user is not available right now");
				break;
			case "userDeleted":
				appendMessage("client", "Client", "This user was either deleted or never existed")	
				break;
			case "notSelected":
				appendMessage("client", "Client", "You haven't clicked a user yet");
				break
		};
	};

	// When websocket closes
	ws.onclose = function(e) {
		appendMessage("client", "Client", "Connection closed");
		console.log("Connection closed");
	};
};
