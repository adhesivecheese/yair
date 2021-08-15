function getNotificationHTML(model) {
	return '<div data-read-url="' + model.url + '" data-id="' + model.id + '" class="notification group">' + '<h4 id="tagline">' + model.title + '<div class="date">' + model.date + '</div>' + '</h4>' + '<div class="body">' + model.body + '</div>' + '</div>';
}
// Display the notifications
function displayNotifications(notifications) {
	var notificationsHTML = '';
	// Loop through each notification
	var messages = 0;
	var itemNum = notifications.data.children;
	for (var i = 0; i < itemNum.length; i++) {
		if (itemNum[i].kind === "t4") messages++;
	}
	if (messages == 0) {
		notificationsHTML = '<div class="no-notifications"><h4>No notifications</h4></div>';
	}
	else {
		for (var i = 0; i < itemNum.length; i++) {
			if (itemNum[i].kind === "t4") {
				// Set up notification and its view model
				var item = notifications.data.children[i];
				var viewModel = {
					id: ''
					, first_message_name: ''
					, title: ''
					, body: ''
					, url: ''
					, date: ''
				};
				if (item.kind == 't4') {
					// Private Message
					viewModel.id = item.data.name;
					if (!item.data.first_message_name) {
						viewModel.url = "http://old.reddit.com/message/yair_conversation/t4_" + item.data.id;
					} else {
						viewModel.url = "http://old.reddit.com/message/yair_conversation/" + item.data.first_message_name;
					}
					if (item.data.author != null ) {
						viewModel.title = '<span class="author">' + item.data.author + '</span> &bull; <span class="subjectLine" id="subject">' + truncate(item.data.subject, 60) + '</span>';
					} else {
						viewModel.title = '<span class="author">#' + item.data.subreddit + '</span> &bull; <span class="subjectLine" id="subject">' + truncate(item.data.subject, 60) + '</span>';
					}
					viewModel.body = truncate(item.data.body, 256);
					viewModel.date = moment(item.data.created_utc, 'X').fromNow();
					notificationsHTML += getNotificationHTML(viewModel);
				}
			}
		}
	}
	$("#notifications").html(notificationsHTML);
}
// Will force a refresh of notifications and will then display them
function updateAndDisplayNotifications(callback) {
	chrome.runtime.sendMessage({
		action: 'updateNotifications'
	}, function (response) {
		displayNotifications(response);
	});
}
// Mark a private message as read
function markAsRead(name, modhash, callback) {
	chrome.runtime.sendMessage({
		action: 'markAsRead'
		, name: name
		, modhash: modhash
	}, callback);
}

// truncates input to defined length while ensuring that the text always ends in a full word
function truncate(text, length) {
	if (text.length > length) {
		text = text.substring(0, length);
		if (text.charAt(text.length - 1) != " ") {
			var lastSpace = text.lastIndexOf(" ");
			text = text.substring(0, lastSpace);
		}
		text += '<span id="truncate">&hellip;</span>';
	}
	return text;
}
// Add logic after dom is ready
$(document).ready(function () {
	var notifications = localStorage.getItem('notifications');
	if (notifications === null) {
		updateAndDisplayNotifications();
	}
	else {
		notifications = JSON.parse(notifications);
		displayNotifications(notifications);
	}
	$("body").on("click", "[data-read-url]", null, function (event) {
		var notifications = JSON.parse(localStorage.getItem('notifications'));
		var notification = $(event.target).closest('.notification');
		var url = notification.data('read-url');
		var id = notification.data('id');
		var foundNotification = false;
		var i = 0;
		for (; i < notifications.data.children.length; i++) {
			if (notifications.data.children[i].data.name == id) {
				foundNotification = true;
				break;
			}
		}
		if (foundNotification) {
			notifications.data.children.splice(i, 1);
			localStorage.setItem('notifications', JSON.stringify(notifications));
		}
		var count = (+localStorage.getItem('notificationCount')) - 1;
		if (count <= 0) {
			localStorage.setItem('notificationCount', '0');
			chrome.browserAction.setBadgeText({
				text: ''
			});
		}
		else {
			localStorage.setItem('notificationCount', '' + count);
			chrome.browserAction.setBadgeText({
				text: '' + count
			});
		}
		markAsRead(id, notifications.data.modhash, function () {
			chrome.tabs.create({
				url: url
			});
		});
	});
	$(".forceRefresh").click(function () {
		$('.forceRefresh').addClass('spin');
		setTimeout(function () {
				$('.forceRefresh').removeClass('spin');
			}, 1500)
			//causes spinner to go around a minimum of one cycle
		updateAndDisplayNotifications();
	});
});
