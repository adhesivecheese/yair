// The interval that holds to update notifications task
var updateNotificationsInterval = null;
var lastNotificationCount = 0;
var actions = {
	getPrivateMessages: function (request, callback) {
		var url = 'https://old.reddit.com/message/messages.json?raw_json=1&limit=100';
		url = url + request.reference;
		
		$.ajax({
			type: 'GET'
			, url: url
		 }).done(function (data) {
			callback(data);
		})
			
	}
	, updateNotifications: function (request, callback) {
		$.ajax({
			type: 'GET'
			, url: 'https://www.reddit.com/message/unread.json?raw_json=1'
		, }).done(function (data) {
			// Set the notifications and the current time
			localStorage.setItem('notifications', JSON.stringify(data));
			localStorage.setItem('lastUpdate', moment().format('X'));
			// Sets the notification count
			var nCount = 0;
			var messages = data.data.children;
			for (var i = 0; i < messages.length; i++) {
				if (messages[i].kind === "t4") {
					nCount++;
					if (typeof yair_user_cfg[messages[i].data.dest] === 'undefined') {
						console.log("YAIR hasn't been initialized for this user yet");
					} else {
						addToDatabase(messages[i].data.dest, messages[i]);
					}
				}
			}
			if (nCount > 0) {
				localStorage.setItem('notificationCount', '' + nCount);
				chrome.browserAction.setBadgeBackgroundColor({
					color: [255, 123, 85, 255]
				});
				chrome.browserAction.setBadgeText({
					text: '' + nCount
				});
				lastNotificationCount = nCount;
			}
			else {
				localStorage.setItem('notificationCount', '0');
				chrome.browserAction.setBadgeText({
					text: ''
				});
				lastNotificationCount = 0;
			}
			if (callback) callback(data);
		});
	}
	, markAsRead: function (request, callback) {
		if (request.name.substring(0, 2) == "t4") {
			$.ajax({
				type: 'POST'
				, url: 'http://www.reddit.com/api/read_message'
				, data: {
					id: request.name
					, uh: request.modhash
				}
			}).done(function (data) {
				if (callback) callback();
			});
		}
		else {
			$.ajax({
				type: 'GET'
				, url: 'http://www.reddit.com/message/unread'
			, }).done(function (data) {
				if (callback) callback();
			});
		}
	}
	, initNotificationsInterval: function () {
		var inboxRefreshInterval = localStorage.getItem('inboxRefreshInterval');
		if(inboxRefreshInterval === null) {
			inboxRefreshInterval = 60000;
			localStorage['inboxRefreshInterval'] = inboxRefreshInterval;
		} else {
			inboxRefreshInterval = +inboxRefreshInterval;
		}
		if (updateNotificationsInterval) {
			clearInterval(updateNotificationsInterval);
		}
		updateNotificationsInterval = setInterval(actions.updateNotifications, inboxRefreshInterval);
	}
};
actions.initNotificationsInterval();

function addToDatabase(username, message) {
	if (yair_user_cfg[username].pmInboxInitialized == true) {
		window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
		window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
		var db;
		var request = indexedDB.open("YAIR_Messages" + username);
		request.onerror = function(event) {
			console.error("bg_fetch database error: " + event.target.errorCode);
		};
		request.onsuccess = function(event) {
			db = event.target.result;
			var transaction = db.transaction(["privateMessages"], "readwrite");
			var objectStore = transaction.objectStore("privateMessages");
			var formatted_message = [{
				"id":message.data.id,
				"author":message.data.author,
				"body":message.data.body,
				"body_html":message.data.body_html,
				"created_utc":message.data.created_utc,
				"dest":message.data.dest,
				"distinguished":message.data.distinguished,
				"first_message_name":message.data.first_message_name,
				"name":message.data.name,
				"new":message.data.new,
				"subject":message.data.subject
			}];
			if (!message.data.first_message_name) {
				formatted_message[0].first_message_name = message.data.name;
			}
			var request = objectStore.add(formatted_message[0]);
			console.log("bg_fetch added " + message.data.id + " to Database");
		};
	}
}

// Wire up the listener.
chrome.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {
		if (actions.hasOwnProperty(request.action)) {
			actions[request.action](request, sendResponse);
		}
		return true;
	}
);
