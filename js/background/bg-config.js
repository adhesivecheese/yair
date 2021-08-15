var yair_default_cfg = {
	version: '0'
	, pmInboxInitialized: false
	, replyInboxInitialized: false
	, maxInitialMessagesShown: 50
	, pageTitle: 'Reddit - YAIR'
	, deleted: []
	, saved: []
	, showModmail: false
	, conversationNewToOld: false
	, compactMode: false
	, deleteDraftAfterDays: 60
	, doImport: true
	, maxAjaxRetries: 5
	, ajaxRetryDelay: 5
	, max403Retries: 15
	, inboxRefreshInterval: 60000
};
var yair_user_cfg = {};
if (typeof localStorage['YAIR_USER_CONFIG'] !== "undefined") {
	yair_user_cfg = JSON.parse(localStorage['YAIR_USER_CONFIG']);
	console.log("Config loaded from localstorage");
}
else {
	console.log("No config found in localstorage");
}
yair.cfg_import = function (cfg) {
	if (typeof cfg.pmInboxInitialized === "object" && cfg.pmInboxInitialized instanceof Array) {
		cfg.pmInboxInitialized = (cfg.pmInboxInitialized.indexOf(this.username) >= 0);
	}
	if (typeof cfg.replyInboxInitialized === "object" && cfg.replyInboxInitialized instanceof Array) {
		cfg.replyInboxInitialized = (cfg.replyInboxInitialized.indexOf(this.username) >= 0);
	}
	yair_user_cfg[this.username] = cfg;
	yair_cfg_save();
};
yair.cfg_set = function (prop, val) {
	yair_user_cfg[this.username][prop] = val;
	yair_cfg_save();
	localStorage['inboxRefreshInterval'] = yair.cfg_user_get('inboxRefreshInterval', this.username);
	this.callback();
};
yair.cfg_user_get = function (prop, username) {
	if (typeof yair_user_cfg[username] === "undefined") {
		yair_user_cfg[username] = yair_default_cfg;
	}
	var cfg = yair_user_cfg[username];
	for (var attr in yair_default_cfg) {
		if (typeof cfg[attr] === "undefined") cfg[attr] = yair_default_cfg[attr];
	}
	if (typeof prop === 'undefined') {
		return cfg;
	}
	return cfg[prop];
};
yair.cfg_get = function (prop) {
	return yair.cfg_user_get(prop, this.username);
};
var yair_cfg_deleted = {
	add: function (id) {
		var index = yair_user_cfg[this.username].deleted.indexOf(id);
		if (index >= 0) return;
		yair_user_cfg[this.username].deleted.push(id);
		yair_cfg_save();
	}
	, remove: function (id) {
		var index;
		while ((index = yair_user_cfg[this.username].deleted.indexOf(id)) >= 0) {
			yair_user_cfg[this.username].deleted.splice(index, 1);
		}
		yair_cfg_save();
	}
};
var yair_cfg_saved = {
	add: function (id) {
		var index = yair_user_cfg[this.username].saved.indexOf(id);
		if (index >= 0) return;
		yair_user_cfg[this.username].saved.push(id);
		yair_cfg_save();
	}
	, remove: function (id) {
		var index;
		while ((index = yair_user_cfg[this.username].saved.indexOf(id)) >= 0) {
			yair_user_cfg[this.username].saved.splice(index, 1);
		}
		yair_cfg_save();
	}
};
yair_cfg_save = function () {
	localStorage['YAIR_USER_CONFIG'] = JSON.stringify(yair_user_cfg);
};