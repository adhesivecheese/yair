(function () {
	yair.cfg.deleted = {
		add: function (id) {
			if (yair.cfg.data.deleted.indexOf(id) >= 0) return;
			yair.cfg.data.deleted.push(id);
			yair.proxy(['yair_cfg_deleted', 'add'], [id]);
		}
		, remove: function (id) {
			yair.proxy(['yair_cfg_deleted', 'remove'], [id]);
			var index;
			while ((index = yair.cfg.data.deleted.indexOf(id)) >= 0) {
				yair.cfg.data.deleted.splice(index, 1);
			}
		}
		, contains: function (id) {
			return (yair.cfg.data.deleted.indexOf(id) >= 0);
		}
	};
	yair.cfg.saved = {
		add: function (id) {
			if (yair.cfg.data.saved.indexOf(id) >= 0) return;
			yair.cfg.data.saved.push(id);
			yair.proxy(['yair_cfg_saved', 'add'], [id]);
		}
		, remove: function (id) {
			yair.proxy(['yair_cfg_saved', 'remove'], [id]);
			var index;
			while ((index = yair.cfg.data.saved.indexOf(id)) >= 0) {
				yair.cfg.data.saved.splice(index, 1);
			}
		}
		, contains: function (id) {
			return (yair.cfg.data.saved.indexOf(id) >= 0);
		}
	};
	yair.cfg.set = function (prop, value) {
		yair.cfg.data[prop] = value;
		yair.proxy(['yair', 'cfg_set'], [prop, value]);
	};
})();