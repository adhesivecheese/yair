var yair = {
	init: {
		funcs: []
		, waitingCallbacks: []
		, completed: []
	}
	, cfg: {
		data: {}
	}
	, proxy: function (path, params, callback) {
		if (typeof callback === "undefined") callback = function () {};
		if (typeof params === "undefined") params = [];
		else if (!(params instanceof Array)) params = [params];
		// Add username to cmdObj
		var cmdObj = {
			action: "proxyCmd"
			, username: getUsername()
			, path: path
			, params: params
		};
		if (!cmdObj.username) {
			console.error("yair.proxy(...); requires the username (from DOM) for most features");
		}
		chrome.runtime.sendMessage(cmdObj, function (response) {
			callback.apply(this, response);
		});
	}
	, helper: {}
	, manifest: chrome.runtime.getManifest()
};
(function ($, undefined) {
	yair.functions = {};
	var startTime;

	function checkCallbacksReady() {
		var callbacks = yair.init.waitingCallbacks;
		var completed = yair.init.completed;
		callbackLoop: for (var i = 0; i < callbacks.length; i++) {
			var keys = callbacks[i].keys;
			var callback = callbacks[i].callback;
			for (var j = 0; j < keys.length; j++) {
				if (completed.indexOf(keys[j]) < 0) continue callbackLoop;
			}
			callbacks.splice(i--, 1);
			callback();
		}
	}
	// Start executing all functions that can be preloaded
	yair.init.start = function () {
		startTime = getTime();
		for (var i = 0; i < yair.init.funcs.length; i++) {
			yair.init.funcs[i]();
		}
	};
	// An init function calls this function when it is done
	// The 'key' parameter is the name of the function
	yair.init.done = function (key) {
		yair.init.completed.push(key);
		checkCallbacksReady();
	};
	// Call this function and pass the names of the functions in an array
	// and a callback that needs to execute after those functions are done
	yair.init.executeAfter = function (keys, callback) {
		if (typeof keys === "string") keys = [keys];
		yair.init.waitingCallbacks.push({
			keys: keys
			, callback: callback
		});
		checkCallbacksReady();
	};
	// Wait until the DOM is ready
	yair.functions.DOMReady = function () {
		$(function () {
			yair.init.done("DOMReady");
		});
		return false;
	};
	// Preload HTML templates
	yair.templates = {
		add: function (obj) {
			var objKeys = Object.keys(obj);
			for (var i = 0; i < objKeys.length; i++) {
				var k = objKeys[i];
				yair.templates[k] = obj[k];
			}
		}
	};
	yair.functions.preloadTemplatesReady = function () {
		var tArray = Object.keys(yair.templates);
		var loadedTemplates = 0;
		for (var i = 0; i < tArray.length; i++) {
			(function (template) {
				var url = yair.templates[template];
				if (typeof url !== "string") {
					return ++loadedTemplates;
				}
				$.get(url).done(function (html) {
					yair.templates[template] = html;
				}).always(function () {
					if (++loadedTemplates >= tArray.length) {
						yair.init.done("preloadTemplatesReady");
					}
				});
			})(tArray[i]);
		}
		return false;
	};
	// Note: This function requires DOMReady because it requires getUsername() for yair.proxy()
	yair.functions.initConfig = function (callback) {
		yair.proxy(['yair', 'cfg_get'], [], function (cfg) {
			if (!cfg.doImport) {
				yair.cfg.data = cfg;
			}
			else {
				// An import needs to be attempted
				if (typeof localStorage['YAIR_CONFIG'] !== "undefined") {
					// There is something to import
					yair.cfg.data = JSON.parse(localStorage['YAIR_CONFIG']);
					//console.log("Importing old data");
				}
				else {
					// There is nothing to import
					yair.cfg.data = cfg;
				}
				yair.cfg.data.doImport = false;
				yair.proxy(['yair', 'cfg_import'], yair.cfg.data);
			}
			yair.init.done("CFGReady");
			if (typeof callback === "function") callback();
		});
	};
})(jQuery);