yair.templates.add({
	alert_alert: chrome.extension.getURL('template/alert_alert.html')
	, alert_html: chrome.extension.getURL('template/alert_html.html')
	, alert_confirm: chrome.extension.getURL('template/alert_confirm.html')
});
var testI = 0;
yair.alerts = {
	html: function (title, html, buttons, clickToDismiss) {
		var $alert = $(yair.templates.alert_html);
		$alert.find('.yair-alert-title-text').text(title);
		$alert.find('.yair-alert-message').html(html);
		$alert.find('button.yair-alert-close').on('click', yair.view.hideOverlay);
		var $buttons = $alert.find('.yair-alert-buttons');
		if (typeof buttons === "object") {
			var buttonTexts = Object.keys(buttons);
			for (var i = 0; i < buttonTexts.length; i++) {
				var text = buttonTexts[i];
				var callback = buttons[text];
				$('<button>').text(text).on('click', callback).on('click', yair.view.hideOverlay).appendTo($buttons);
				$buttons.append(' ');
			}
		}
		if (typeof clickToDismiss !== "boolean") clickToDismiss = true;
		yair.$e.overlay.empty().append($alert);
		yair.view.showOverlay(clickToDismiss);
		return $alert;
	}
	, error: function (title, message) {
		yair.alerts.alert(title, message, false).addClass('yair-alert-error');
	}
	, alert: function (title, message, clickToDismiss) {
		var $alert = $(yair.templates.alert_alert);
		$alert.find('.yair-alert-title-text').text(title);
		$alert.find('.yair-alert-message').text(message);
		$alert.find('button').on('click', yair.view.hideOverlay);
		if (typeof clickToDismiss !== "boolean") clickToDismiss = true;
		yair.$e.overlay.empty().append($alert);
		yair.view.showOverlay(clickToDismiss);
		return $alert;
	}
	, confirm: function (title, message, callback) {
		var $alert = $(yair.templates.alert_confirm);
		$alert.find('.yair-alert-title-text').text(title);
		$alert.find('.yair-alert-message').text(message);
		$alert.find('button').on('click', yair.view.hideOverlay);
		$alert.find('.yair-confirm-yes').on('click', callback);
		yair.$e.overlay.empty().append($alert);
		yair.view.showOverlay(false);
		return $alert;
	}
}