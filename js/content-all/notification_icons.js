(function () {
	function referenceElement(ele) {
		return {
			insertAfter: function (insert) {
				ele.parentNode.insertBefore(insert, ele.nextSibling);
				return referenceElement(insert);
			}
		};
	}
	var res = {
		compatibility: function () {
			res.monitorRESMailcount();
			res.initHtml();
		}
		, mailCountUpdates: function () {
			return (document.body.classList.contains('res-v4') || document.body.classList.contains('res-v5'));
		}
		, getMailCount: function () {
			if (res.mailCountUpdates()) {
				// This gives us an initial message count, but knowing the message count is useless unless the counter updates
				var stockMailCountElement = document.querySelector('#header .message-count');
				if (stockMailCountElement) {
					return parseInt(stockMailCountElement.innerText);
				}
				return 0;
			}
			else {
				if (document.querySelector('#NREMail').classList.contains('havemail')) {
					return 1;
				}
				return 0;
			}
		}
		, monitorRESMailcount: function () {
			var lastMailcount = res.getMailCount();

			function neverEndingPageload() {
				var mailCount = res.getMailCount();
				if (mailCount === 0) {
					HelpFuncs.updateMailElements({
						pm: 0
						, reply: 0
					});
				}
				else if (mailCount !== lastMailcount) {
					lastMailcount = mailCount;
					HelpFuncs.checkMail();
				}
			}
			window.addEventListener("neverEndingLoad", neverEndingPageload);
		}
		, initHtml: function () {
			if (!document.querySelector('#NREMail')) { return }
			var ori_mail = document.querySelector('#NREMail');
			var parent_li = ori_mail.parentElement;
			parent_li.style.display = 'none';
			var new_pm = document.createElement('a');
			new_pm.classList.add('yair-privatemessages');
			new_pm.setAttribute('href', '/message/yair_inbox');
			var pm_li = document.createElement('li');
			pm_li.appendChild(new_pm);
			var new_reply = document.createElement('a');
			new_reply.classList.add('yair-mail');
			new_reply.setAttribute('href', '/message/inbox/');
			var reply_li = document.createElement('li');
			reply_li.appendChild(new_reply);
			referenceElement(parent_li).insertAfter(pm_li).insertAfter(reply_li);
			elements.defaultInboxIcons.push(new_reply);
			elements.yairInboxIcons.push(new_pm);
			if (initialMessageCount > 0) {
				HelpFuncs.checkMail();
			}
		}
	};
	var HelpFuncs = {
		createSeparator: function () {
			var ele = document.createElement('span');
			ele.classList.add('separator');
			ele.classList.add('BlueBar__accountDivider');
			ele.innerText = '|';
			return ele;
		}
		, createMessageCount: function (href, messageCount) {
			if (typeof messageCount === "undefined") messageCount = "";
			var ele = document.createElement('a');
			ele.classList.add('message-count');
			ele.innerText = messageCount;
			ele.setAttribute('href', href);
			return ele;
		}
		, getTime: function () {
			return new Date().getTime();
		}
		, getUnreadMessagesJson: function (callback) {
			var xhr = new XMLHttpRequest();
			xhr.open('GET', '/message/unread.json', true);
			xhr.onreadystatechange = function () {
				if (this.readyState === 4 && this.status === 200) {
					var json = JSON.parse(this.responseText);
					data.lastJsonCache = json;
					callback(json);
				}
			};
			xhr.send();
		}
		, getTypedMessageCount: function (json) {
			var numPm = 0;
			var numReply = 0;
			var messages = json.data.children;
			for (var i = 0; i < messages.length; i++) {
				if (messages[i].kind === "t4") numPm++;
				if (messages[i].kind === "t1") numReply++;
			}
			return {
				pm: numPm
				, reply: numReply
			};
		}
		, updateMailElements: function (count) {
			if (count.pm > 0) {
				for (var i = 0; i < elements.yairInboxIcons.length; i++) {
					elements.yairInboxIcons[i].classList.add('yair-havemail');
				}
				for (var i = 0; i < elements.yairInboxCounts.length; i++) {
					elements.yairInboxCounts[i].innerText = count.pm;
				}
			}
			else {
				for (var i = 0; i < elements.yairInboxIcons.length; i++) {
					elements.yairInboxIcons[i].classList.remove('yair-havemail');
				}
				for (var i = 0; i < elements.yairInboxCounts.length; i++) {
					elements.yairInboxCounts[i].innerText = '';
				}
			}
			if (count.reply > 0) {
				for (var i = 0; i < elements.defaultInboxIcons.length; i++) {
					elements.defaultInboxIcons[i].classList.add('yair-havemail');
				}
				for (var i = 0; i < elements.defaultInboxCounts.length; i++) {
					elements.defaultInboxCounts[i].innerText = count.reply;
				}
			}
			else {
				for (var i = 0; i < elements.defaultInboxIcons.length; i++) {
					elements.defaultInboxIcons[i].classList.remove('yair-havemail');
				}
				for (var i = 0; i < elements.defaultInboxCounts.length; i++) {
					elements.defaultInboxCounts[i].innerText = '';
				}
			}
		}
		, checkMail: function () {
			var curTime = HelpFuncs.getTime();
			if ((curTime - data.lastMailCheck) < 10000) {
				if (data.lastJsonCache) {
					var count = HelpFuncs.getTypedMessageCount(data.lastJsonCache);
					HelpFuncs.updateMailElements(count);
				}
				return;
			}
			data.lastMailCheck = curTime;
			HelpFuncs.getUnreadMessagesJson(function (json) {
				var count = HelpFuncs.getTypedMessageCount(json);
				HelpFuncs.updateMailElements(count);
			});
		}
	};
	var elements = {
		defaultInboxIcons: []
		, defaultInboxCounts: []
		, yairInboxIcons: []
		, yairInboxCounts: []
	, };
	var data = {
		lastMailCheck: 0
		, lastJsonCache: null
	};
	onExtLoaded('res', res.compatibility);

	function initDefaultDOMChanges() {
		var ori_mail = document.querySelector('#mail');
		if (ori_mail === null) {
			var ori_mail = document.querySelector('.icon-message');
		}
		var new_pm = document.createElement('a');
		new_pm.classList.add('yair-privatemessages');
		new_pm.setAttribute('href', '/message/yair_inbox');
		var new_pm_count = HelpFuncs.createMessageCount('/message/yair_inbox');
		var new_reply = document.createElement('a');
		new_reply.classList.add('yair-mail');
		new_reply.setAttribute('href', '/message/inbox/');
		var new_reply_count = HelpFuncs.createMessageCount('/message/inbox');
		if (ori_mail !== null) {
			referenceElement(ori_mail.previousSibling).insertAfter(new_pm).insertAfter(new_pm_count)
				.insertAfter(HelpFuncs.createSeparator()).insertAfter(new_reply).insertAfter(new_reply_count);
			ori_mail.style.display = "none";
		}
		elements.defaultInboxIcons.push(new_reply);
		elements.defaultInboxCounts.push(new_reply_count);
		elements.yairInboxIcons.push(new_pm);
		elements.yairInboxCounts.push(new_pm_count);
	}
		
	function initDefaultDOMChangesForNewReddit() {
		var nightModeDetect = window.getComputedStyle(document.querySelector("#SHORTCUT_FOCUSABLE_DIV > div:nth-child(2)")).getPropertyValue('--newCommunityTheme-body');
		var ori_mail = document.querySelector('#HeaderUserActions--Messages');
		var new_pm = document.createElement('a');
		console.log(nightModeDetect);
		if (nightModeDetect != ' #FFFFFF') {
			new_pm.style.fill = "#d7dadc";
		}
		new_pm.innerHTML = "<svg viewBox=\"0 0 16 16\" xmlns=\"http://www.w3.org/2000/svg\"><path class=\"st0\" d=\"M8,0C3.58,0,0,3.58,0,8s3.58,8,8,8s8-3.58,8-8S12.42,0,8,0z M11.08,4.89L8,12.08 c-0.24,0.55-0.41,0.99-1.13,0.99c-0.75,0-1.03-0.59-1.03-0.93c0-0.36,0.11-0.6,0.35-1.15l0.69-1.56L5.11,5.2 C4.87,4.64,4.67,4.15,4.67,3.91c0-0.61,0.49-0.97,1.01-0.97c0.51,0,0.87,0.27,1.07,0.79L7.98,6.9l1.16-2.83 c0.27-0.64,0.56-1.13,1.13-1.13c0.64,0,1.07,0.41,1.07,1.05C11.33,4.29,11.19,4.65,11.08,4.89z\"/></svg>";
		new_pm.classList.add('yair-privatemessages-newredit');
		new_pm.setAttribute('href', 'https://old.reddit.com/message/yair_inbox');
		var new_pm_count = document.createElement('span');
		new_pm_count.classList.add('count_badge');
		var new_pm_holder = document.createElement('span');
		new_pm_holder.setAttribute('id', 'HeaderUserActions--YAIR');
		new_pm_holder.appendChild(new_pm);
		const request = async () => {
			var new_reply_count_num = 0
			var new_pm_count_num = 0;
			const response = await fetch('https://www.reddit.com/message/unread.json');
			const json = await response.json();
			var messages = json.data.children;
			for (var i = 0; i < Object.keys(messages).length; i++) {
				if (messages[i].kind === "t4") { new_pm_count_num++; } else {new_reply_count_num++; }
			}
			if (new_pm_count_num > 0) {
				new_pm.classList.remove('yair-privatemessages-newredit');
				new_pm.classList.remove('yair-privatemessages-newreddit-night');
				new_pm.classList.add('yair-privatemessages-newredit-newmail');
				new_pm.appendChild(new_pm_count);
			}
			new_pm_count.innerHTML = new_pm_count_num;
			var ori_badge = document.querySelector("#HeaderUserActions--Messages > a > span");
			if (ori_badge != null) {
				if (new_reply_count_num > 0) {
					ori_badge.innerHTML = new_reply_count_num;
				} else {
					ori_badge.style.display = "none";
				}
			}
			if (new_pm_count_num > 0 && new_reply_count_num == 0) {
				if (nightModeDetect != ' #FFFFFF') {
					document.querySelector("#HeaderUserActions--Messages > a > svg").style.fill = "rgb(215, 218, 220)";
				} else {
					document.querySelector("#HeaderUserActions--Messages > a > svg").style.fill = "rgb(26, 26, 27)"
				}
			}
			if (ori_mail !== null) {
				referenceElement(ori_mail.previousSibling).insertAfter(new_pm_holder);
			}
			elements.yairInboxIcons.push(new_pm);
			elements.yairInboxCounts.push(new_pm_count);
		}
		request();
	}
	
	var initialMessageCount = 0;
	document.addEventListener("DOMContentLoaded", function () {
		var originalMessageCountElement = document.querySelector('#header .message-count');
		var newReddit = document.getElementById("2x-container");
		if (newReddit == null) {
			initDefaultDOMChanges();
		} else {
			initDefaultDOMChangesForNewReddit();
		}
		if (originalMessageCountElement && originalMessageCountElement.innerText) {
			initialMessageCount = parseInt(originalMessageCountElement.innerText);
			if (initialMessageCount > 0) HelpFuncs.checkMail();
		}
	});
})();