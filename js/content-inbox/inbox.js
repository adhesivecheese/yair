(function ($) {
	yair.templates.add({
		inbox_layout: chrome.extension.getURL('template/inbox_layout.html'),
		inbox_message_row: chrome.extension.getURL('template/inbox_message_row.html'),
		conversation: chrome.extension.getURL('template/conversation.html'),
		conversation_reverse: chrome.extension.getURL('template/conversation_reverse.html'),
		private_message: chrome.extension.getURL('template/private_message.html'),
		load_more_messages: chrome.extension.getURL('template/load_more_messages.html'),
		config: chrome.extension.getURL('template/config.html')
	});
	yair.init.funcs.push(yair.functions.DOMReady);
	yair.init.funcs.push(yair.functions.preloadTemplatesReady);
	yair.view = {
		scrollToUnread: function () {
			var $firstUnread = $('.yair-private-message:not(.yair-collapsed)').first();
			var rect = $firstUnread[0].getClientRects();
			var top = rect[0].top + window.scrollY;
			var scrollTo = top - 190;
			if (scrollTo <= 100) { return; }
			$('html, body').animate({
				scrollTop: scrollTo
			}, 750);
		},
		showConversation: function (conversation) {
			// Remove previous contents of main panel
			yair.$e.mainPanel.empty();
			var templateFile = yair.cfg.data.conversationNewToOld ? yair.templates.conversation_reverse : yair.templates.conversation;
			var $conversation = $(templateFile).appendTo(yair.$e.mainPanel);
			$conversation.data('conversation', conversation);
			var quill = new Quill("#editor", {
				modules: {
					toolbar: [
						["bold", "italic", "strike"],
						[{ 'list' : 'bullet' }, { 'list' : 'ordered' }],
						["link"]
					]
				},
				placeholder: "Message Response...",
				theme: "snow"
			});

			var turndownService = new TurndownService();
			turndownService.addRule('strike', { filter: ['s'], replacement: function (content) { return '~~' + content + '~~'; }});
			turndownService.addRule('italic', { filter: ['em'], replacement: function (content) { return '*' + content + '*'; }});
			turndownService.addRule("superscript", { filter: ["sup"], replacement: function(content) { return "^(" + content + ')'; }});

			quill.on("text-change", function (delta, source) {
				var html = quill.container.firstChild.innerHTML;
				var markdown = turndownService.turndown(html);
				$("#markdown").val(markdown);
			});
			
			var $visInput = $conversation.find('.ql-editor');
			var $input = $conversation.find('textarea');
			var $submit = $conversation.find('.yair-conversation-reply-btn');
			var $preview = $conversation.find('.yair-conversation-preview');
			var $messageArea = $conversation.find('.yair-private-messages');
			var $saveToggle = $conversation.find('.yair-save-toggle');
			$conversation.find('#collapseToggle').on('click', function () {
				if ($conversation.find("#collapseToggle").prop("title") === "Expand all") {
					$messageArea.find('.yair-private-message').removeClass('yair-collapsed');
					$conversation.find('#collapseToggle.yair-expand-all-btn').css("background-position", "0px -323px");
					$conversation.find('#collapseToggle').prop("title", "Collapse all");
				} else {
					$messageArea.find('.yair-private-message').addClass('yair-collapsed');
					$conversation.find('#collapseToggle.yair-expand-all-btn').css("background-position", "0px -340px");
					$conversation.find('#collapseToggle').prop("title", "Expand all");
				}
			});
			$conversation.find('#YairExportConversation').on('click', yair.controller.exportConversation);
			$conversation.find('.yair-conversation-title').text(conversation.subject);
			$saveToggle.on('click', yair.controller.action.toggleSave);
			if (yair.cfg.saved.contains(conversation.id)) {
				$saveToggle.addClass('yair-saved');
			}
			yair.proxy(['drafts', 'get'], [conversation.id], function (response) {
				if (!response) { return; }
				$visInput.html(yair.markdown.render(response));
				$input.text(response);
				$preview.html(yair.markdown.render(response));
				$('.yair-conversation-reply-btn').removeAttr('disabled');
			});
			var messages = conversation.messages.slice();
			if (yair.cfg.data.conversationNewToOld) { messages.reverse(); }
			var numMessages = messages.length;
			var responseId = null;
			for (var i = 1; i <= numMessages; i++) {
				(function (pm) {
					var $pm = $(replaceAll(yair.templates.private_message, '{author}', pm.author));
					$pm.find('.yair-pm-body').html(pm.body_html);
					$pm.find('.yair-pm-body-short').text(pm.body);
					$pm.find('.yair-message-date-string').text(longDateString(pm.created_utc)).attr('data-timestamp', pm.created_utc);
					$pm.find('.yair-message-date-string').attr("title", moment.utc(pm.created_utc * 1000).local().format("ddd MMM DD LTS YYYY Z"));
					$pm.find('.yair-pm-header').on('click', function () {
						$pm.toggleClass('yair-collapsed');
					});
					$pm.find('.yair-title-text h4').on('click', function (e) {
						e.stopPropagation();
						window.open('/user/' + this.innerText, '_blank');
					});
					$pm.appendTo($messageArea);
					if (pm.author !== getUsername()) {
						responseId = pm.name;
					}
					if (pm['new']) return;
					if (yair.cfg.data.conversationNewToOld && i === 1) return;
					if (!yair.cfg.data.conversationNewToOld && i === numMessages) return;
					$pm.addClass('yair-collapsed');
				})(messages[numMessages - i]);
			}
			if (!yair.cfg.data.conversationNewToOld) yair.view.scrollToUnread();
			if (!responseId) {
				// You cannot respond unless the other person has said something
				$conversation.find('.yair-message-editor').remove();
			}
			else {
				yair.view.addEditor();
				// TODO: This should be a function
				var throttledDraftSave = throttle(function (inputText) {
					yair.proxy(['drafts', 'set'], [conversation.id, inputText]);
				}, 500);
				$input.on('keyup', function () {
					var inputText = $input.val();
					$preview.html(yair.markdown.render(inputText));
					throttledDraftSave(inputText);
				});
				$visInput.on('keyup', function () {
					var inputText = $input.val();
					$preview.html(yair.markdown.render(inputText));
					throttledDraftSave(inputText);
				});
				
				$visInput.on('change input paste keyup textarea', function() {
					if ($(".yair-conversation-input").val() == '') {
						$('.yair-conversation-reply-btn').attr('disabled', 'disabled');
					} else {
						$('.yair-conversation-reply-btn').removeAttr('disabled');
					}
				});
				$input.on('change input paste keyup textarea', function() {
					if ($(".yair-conversation-input").val() == '') {
						$('.yair-conversation-reply-btn').attr('disabled', 'disabled');
					} else {
						$('.yair-conversation-reply-btn').removeAttr('disabled');
					}
				});
				
				// TODO: This should be a function
				$submit.on('click', function () {
					yair.view.showLoading("Message is being sent");
					var browser=navigator.userAgent.toLowerCase(); //Firefox browser detection bodge
					var postUrl = null;
					if (browser.indexOf('firefox') > -1) {
						postUrl = 'https://www.reddit.com/api/comment';
					} else {
						postUrl = '/api/comment';
					}
					var postXhr = $.post(postUrl, {
						thing_id: responseId
						, uh: yair.model.uh
						, text: $input.val()
						, api_type: 'json'
					});
					postXhr.done(function (response) {
						if (!response.json.errors || !response.json.errors.length) {
							yair.proxy(['drafts', 'delete'], [conversation.id]);
							yair.model.updateDb(yair.view.update, yair.view.showNotification);
						}
						else {
							// TODO: Show relevant error message
							yair.alerts.error('Error', 'Something went wrong, the error handler here is not implemented yet. Sorry!');
						}
					});
					postXhr.fail(function () {
						// TODO: Show relevant error message
						yair.alerts.error('Error', 'Something went wrong, the error handler here is not implemented yet. Sorry!');
					});
				});
			}

			yair.view.updateBodyClass();
			yair.model.setConversationStatus(conversation, true);
			
			//Mark Conversation read on Reddit
			var browser = navigator.userAgent.toLowerCase(); //Firefox browser detection bodge
			var postUrl = null;
			if (browser.indexOf('firefox') > -1) { postUrl = 'https://www.reddit.com/api/read_message'; }
			else { postUrl = '/api/read_message'; }
			conversation.messages.forEach(function(element) {
				if (element.author !== getUsername()){
					var postXhr = $.post(postUrl, {id: element.name, uh: yair.model.uh});
				}
			});
			
			if (yair.cfg.deleted.contains(conversation.id)){
				$('.conversation-header-right .icon-archive').hide();
			} else {
				$('.icon-restore').hide();
			}
			$('.icon-archive').on('click', yair.controller.action.bulkDelete);
			$('.icon-restore').on('click', yair.controller.action.bulkRestore);
			$('.icon-markUnread').on('click', yair.controller.action.bulkMarkUnread);
			$('.yair-conversation-input').autogrow();
			
			if (yair.cfg.data.showModmail) {
				$(".yair-modmail").removeClass("yair-hide");
			}
		}
		, showInbox: function (conversations, hideOverlay) {
			if (typeof hideOverlay !== "boolean") hideOverlay = true;
			// Empty panel
			yair.$e.mainPanel.empty();
			// Cache the fetched conversations
			yair.model.cache.conversations = conversations;
			yair.view.setFavicon();
			//update the inboxRefreshInterval, in case we've changed user
			//TODO: Find a better way to do this
			yair.cfg.set('inboxRefreshInterval', yair.cfg.data.inboxRefreshInterval);
			// Filter conversations
			var filteredConversations = conversations.slice();
			yair.model.searchFilter(filteredConversations);
			yair.model.directoryFilter(filteredConversations);
			yair.model.showModmailInInbox(filteredConversations);
			// Show conversations
			yair.proxy(['drafts', 'getAllKeys'], [], function (draftsKeys) {
				yair.model.cache.draftsKeys = draftsKeys;
				yair.view.addConversationsToInbox(filteredConversations);
			});
			// Hide overlay
			if (hideOverlay) yair.view.hideOverlay();
		}
		, setFavicon: function () {
			var icon = '16.png';
			$('head link[rel="shortcut icon"]').remove();
			var link = document.createElement('link');
			link.type = 'image/png';
			link.rel = 'shortcut icon';
			link.href = chrome.extension.getURL('images/icons/' + icon);
			document.querySelector('head').appendChild(link);
		}
		, update: function () {
			// Init search from URL
			yair.view.hideOverlay();
			yair.controller.parseUrl();
			yair.view.updateBodyClass();
			if (yair.show === "conversation") {
				// Show this conversation
				yair.model.getConversation(yair.showid, yair.view.showConversation);
			}
			if (['inbox', 'drafts', 'saved', 'archived', 'modmail', 'moddrafts', 'modsaved', 'modarchived'].indexOf(yair.show) >= 0) {
				// Fetch all conversations and add them to the inbox view
				yair.model.getConversations(yair.view.showInbox);
			}
		}
		, addMessageInInbox: function (conversation) {
			var unread = conversation['new']
				, id = conversation.id
				, correspondent = conversation.correspondent
				, subject = conversation.subject
				, message = conversation.text.replace('&amp;', "&").replace('&lt;', "<").replace('&gt;', ">")
				, datetime = conversation.last_update
				, hasDraft = (yair.model.cache.draftsKeys.indexOf(id) >= 0)
				, modmail = conversation.modmail;
			var checkboxId = 'yair_cb_' + id;
			var html = replaceAll(yair.templates.inbox_message_row, "{checkboxid}", checkboxId);
			var $row = $(html).appendTo(yair.$e.mainPanel);
			if (conversation.last_author === getUsername()) {
				$row.find('.yair-last-author').addClass('yair-last-sent').attr('title', 'The last message in this thread was sent by you');
			}
			else {
				$row.find('.yair-last-author').addClass('yair-last-received').attr('title', 'The last message in this thread was sent by ' + conversation.last_author);
			}
			$row.find('.yair-message-row-content').attr('data-type', 'message');
			$row.find('.yair-message-row-content').attr('data-author', conversation.correspondent);
			if (yair.cfg.saved.contains(conversation.id)) {
				$row.find('.yair-save-toggle').addClass('yair-saved');
			}
			$row.find('.yair-save-toggle').on('click', yair.controller.action.toggleSave);
			$row.find('.icon-archive').on('click', yair.controller.action.delete);
			$row.find('.icon-restore').on('click', yair.controller.action.restore);
			$row.find('.icon-markRead').on('click', yair.controller.action.markRead);
			$row.find('.icon-markUnread').on('click', yair.controller.action.markUnread);
			if (unread) {
				$row.addClass('yair-unread');
			} else {
				$row.addClass('yair-read');
			}
			if (hasDraft) $row.addClass('yair-has-draft');
			if (modmail) $row.addClass('yair-modmail');
			$row.data('conversation', conversation);
			if (correspondent && correspondent.charAt(0) == "#") {
				var subreddit = correspondent.substring(1);
				$row.find('.yair-correspondent').html("<a href='https://www.reddit.com/r/" + subreddit + "' class='author'>" + correspondent + "</a>");
			} else {
				$row.find('.yair-correspondent').html("<a href='https://www.reddit.com/user/" + correspondent + "' class='author'>" + correspondent + "</a>");
			}
			$row.find('.yair-subject').text(subject);
			$row.find('.yair-text').text(message);
			$row.find('.yair-datetime').text(dateString(datetime));
			var $checkbox = $row.find('input');
			$checkbox.on('change', function () {
				$row.toggleClass('yair-row-checked');
			});
			$row.on('click', yair.controller.showMessageClick);
			$row.find('.yair-message-row-control').on('click', function (e) {
				e.stopPropagation();
			});
			$row.find('.yair-correspondent').on('click', function (e) {
				e.stopPropagation();
			});
			$row.find('.yair-message-buttons').on('click', function (e) {
				e.stopPropagation();
			});
		}
		, updateBodyClass: function () {
			if (['inbox', 'drafts', 'saved', 'archived', 'conversation', 'modmail', 'moddrafts', 'modsaved', 'modarchived'].indexOf(yair.show) < 0) return;
			yair.$e.body.removeClass('yair-show-inbox yair-show-drafts yair-show-saved yair-show-archived yair-show-conversation yair-show-modmail yair-show-moddrafts yair-show-modsaved yair-show-modarchived');
			yair.$e.body.addClass('yair-show-' + yair.show);
		}
		, initLayout: function () {
			//  Set page title
			document.title = yair.cfg.data.pageTitle;
			$('<title>').text(yair.cfg.data.pageTitle);
			// Establish container for saved DOM elements
			yair.$e = {
				body: $('body')
				, loading: $('<span class="yair-loading-icon">')
				, get statusText() {
					var $ele = $('.loading-message .yair-loading-status');
					if ($ele.length > 0) return $ele;
					var $load = $('.loading-message');
					if ($load.length > 0) {
						return $('<span class="yair-loading-status">').appendTo($load);
					}
					return $('<div>');
				}
			};
			// "uh" is used to send messages
			yair.model.uh = yair.$e.body.find('input[name="uh"]').val();
			// If history.pushState has been used, popstate should trigger a view update
			$(window).on('popstate', yair.view.update);
			// Create global container
			yair.$e.content = $('<div class="yair-content">').appendTo($('body > .content'));
			yair.$e.overlay = $('<div class="yair-overlay">').appendTo(yair.$e.body);
			// Compact Mode
			if (yair.cfg.data.compactMode) {
				yair.$e.body.addClass('yair-compact-mode');
			}
			if (yair.cfg.data.nightMode) {
				yair.$e.body.addClass('yair-nightmode');
			}
			// Load page content
			yair.$e.content.html(yair.templates.inbox_layout);
			yair.$e.mainPanel = $('.yair-inbox-panel');
			yair.$e.search = $('#YAIRSearchInput');
			yair.$e.searchBtn = $('#YAIRSearchButton');
			// Rebind the inbox / saved / archived buttons
			// So that the entire page wont have to be redownloaded
			yair.$e.content.find('a.yair-link').on('click', function (e) {
				var url = $(this).attr('href');
				var refresh = (!location.search && location.pathname === url);
				yair.$e.search.val('');
				$('#select-all').prop("checked", false);
				$(".yair-sidebar-options").addClass("yair-hide");
				e.preventDefault();
				if (refresh) {
					yair.controller.reloadInbox();
				}
				else {
					history.pushState({}, yair.cfg.data.pageTitle, url);
					yair.view.update();
				}
			});
			// Bind our searchbar
			yair.$e.searchBtn.on('click', function () {
				yair.controller.search(yair.$e.search.val());
			});
			yair.$e.search.on('keyup', function (e) {
				// Should eventually also do something with auto complete or something like that
				if (e.keyCode === 13) yair.controller.search(yair.$e.search.val());
			});
			// If the URL includes a search, place the search in the search bar
			if (yair._get.search) {
				yair.$e.search.val(decodeURIComponent(yair._get.search));
			}
			if ( !$("#new_modmail").length && !$("#modmail").length) {
				$(".yair-modmail").css("display","none");
			}
		}
		, bindActionButtons: function(){
            $('#YAIRBulkDelete').on('click', yair.controller.action.bulkDelete);
            $('#YAIRBulkRestore').on('click', yair.controller.action.bulkRestore);
            $('#YAIRBulkMarkRead').on('click', yair.controller.action.bulkMarkUnread);
            $('#YAIRBulkMarkUnread').on('click', yair.controller.action.bulkMarkRead);
            $('#YAIRShowConfig').on('click', yair.view.showConfig);
			$(document).on('change', '.styled-checkbox', yair.view.showBulkOptions);
			$('#select-all').on('change', yair.view.selectAll);
        }
		, showBulkOptions: function () {
			if($('.yair-main-panel .styled-checkbox').is(":checked")) {
				$(".yair-sidebar-options").removeClass("yair-hide");
			} else {
				$(".yair-sidebar-options").addClass("yair-hide");
				$('#select-all').prop("checked", false);
			}
		}
		, selectAll: function () {
			var checkedStatus = this.checked;
			$('.styled-checkbox').prop('checked', checkedStatus);
		}
		, showConfig: function () {
			var $config = $(yair.templates.config);
			$config.on('click', stopEvent);
			// TABS
			var contentTabs = {};
			var $contentTabs = $config.find('.yair-config-content-panel .yair-config-content');
			$contentTabs.each(function () {
				var $content = $(this);
				var name = $content.data('tab-content');
				contentTabs[name] = $content;
			});
			var $tabs = $config.find('.yair-config-tabs .yair-config-tab');
			$tabs.on('click', function () {
				var $tab = $(this);
				var name = $tab.data('tab');
				$tabs.removeClass('yair-active-tab');
				$tab.addClass('yair-active-tab');
				$contentTabs.removeClass('yair-active-tab');
				contentTabs[name].addClass('yair-active-tab');
			});
			// Buttons
			$config.find('#YAIRResetInboxToggle').on('click', function () {
				$config.find('#YAIRConfirmReset').removeClass('yair-hide');
			});
			$config.find('#YAIRResetInbox').on('click', function () {
				yair.$e.overlay.empty().off();
				yair.controller.resetInbox();
			});
			$config.find('#YAIRReindexMessages').on('click', function () {
				yair.$e.overlay.empty().off();
				yair.controller.reindexMessages();
			});
			$config.find('#YAIRCancelResetInbox').on('click', function () {
				$config.find('#YAIRConfirmReset').addClass('yair-hide');
			});
			// Set checkbox-states
			var $showModMail = $config.find('#YAIRShowModMail');
			$showModMail.prop('checked', yair.cfg.data.showModmail);
			var $compactMode = $config.find('#YAIRCompactMode');
			$compactMode.prop('checked', yair.cfg.data.compactMode);

			var $nightMode = $config.find('#YairNightMode');
			$nightMode.prop('checked', yair.cfg.data.nightMode);
			
			var $showNewFirst = $config.find('#YAIRNewFirst');
			$showNewFirst.prop('checked', yair.cfg.data.conversationNewToOld);

			//set dropdown state
			var $inboxRefreshInterval = $config.find("#YAIRRefreshInterval");
			$inboxRefreshInterval.val(yair.cfg.data.inboxRefreshInterval).change();
			
			// Save settings
			$config.find('.yair-config-footer .yair-save-button').on('click', function () {
				var showModmail = $showModMail.prop('checked');
				var compactMode = $compactMode.prop('checked');
				var nightMode = $nightMode.prop('checked');
				var showNewFirst = $showNewFirst.prop('checked');
				var inboxRefreshInterval = $inboxRefreshInterval.val();
				if (compactMode) {
					yair.$e.content.addClass('yair-compact-mode'); 
				} else {
					yair.$e.content.removeClass('yair-compact-mode');
				}
				if (nightMode) {
					yair.$e.body.addClass('yair-nightmode'); 
				} else {
					yair.$e.body.removeClass('yair-nightmode');
				}
				yair.cfg.set('showModmail', showModmail);
				yair.cfg.set('compactMode', compactMode);
				yair.cfg.set('nightMode', nightMode);
				yair.cfg.set('conversationNewToOld', showNewFirst);
				yair.cfg.set('inboxRefreshInterval', parseInt(inboxRefreshInterval, 10));
				if (yair.show === "conversation") {
					yair.view.showNotification("Refresh page for this to take effect");
				}
				else {
					yair.view.showInbox(yair.model.cache.conversations, false);
				}
				yair.view.hideOverlay();
			});
			yair.$e.body.addClass('yair-modal-open');
			yair.$e.overlay.empty().append($config);
			yair.view.showOverlay(true, function () {
				yair.$e.body.removeClass('yair-modal-open');
			});
			
			if ( !$("#new_modmail").length && !$("#modmail").length ) {
				$("#ModMail-config").css("display","none");
			}
			
		}
		, showOverlay: function (clickToDismiss, dismissCallback) {
			yair.model.cache.hideOverlay = false;
			yair.$e.overlay.show();
			setTimeout(function () {
				yair.$e.overlay.addClass('show');
			}, 10);
			if (typeof clickToDismiss === "boolean" && clickToDismiss) {
				setTimeout(function () {
					yair.$e.overlay.children().on('click', stopEvent);
					yair.$e.overlay.on('click', function () {
						if (typeof dismissCallback === 'function') dismissCallback();
						yair.view.hideOverlay();
					});
				}, 10);
			}
		}
		, hideOverlay: function () {
			yair.model.cache.hideOverlay = true;
			setTimeout(function () {
				if (!yair.model.cache.hideOverlay) return;
				yair.$e.overlay.off().removeClass('show');
				setTimeout(function () {
					if (!yair.model.cache.hideOverlay) return;
					yair.$e.overlay.hide();
				}, 600);
			}, 50);
		}
		, isLoading: function () {
			return $('.yair-overlay.show .loading-message').length > 0;
		}
		, showLoading: function (message) {
			if (message === undefined) message = 'Loading';
			var $element;
			if (yair.view.isLoading()) {
				$element = $('.yair-overlay.show .loading-message').text(message).prepend(yair.$e.loading.clone());
			}
			else {
				$element = $('<div class="loading-message">').text(message).prepend(yair.$e.loading.clone()).appendTo(yair.$e.overlay.empty());
				yair.view.showOverlay();
			}
			return $element;
		}
		, showNotification: function (message, duration) {
			if (typeof duration === "undefined") duration = 1500;
			if (message === undefined) message = 'Loading';
			$('<div class="notification-message">').text(message).appendTo(yair.$e.overlay.empty());
			yair.$e.overlay.show().addClass('show');
			if (duration < 0) return;
			setTimeout(function () {
				yair.view.hideOverlay();
			}, duration);
		}
		, addConversationsToInbox: function (conversations) {
			var copy = conversations.slice();
			var conversationsAdded = 0;
			for (var i = 0; i < copy.length; i++) {
				var conversation = copy[i];
				// Add message to inbox
				yair.view.addMessageInInbox(conversation);
				// If the maximum number of conversations has been added
				if (++conversationsAdded > yair.cfg.data.maxInitialMessagesShown) {
					// Add load more content element
					yair.view.addLoadMoreElement(yair.templates['load_more_messages'], yair.$e.mainPanel, yair.view.addConversationsToInbox, copy.splice(i + 1));
					break;
				}
			}
		}
		, showStatus: function (statusMsg) {
			if (statusMsg !== false) {
				yair.$e.statusText.text(statusMsg);
			}
			else {
				yair.view.hideOverlay();
				setTimeout(function () {
					yair.view.showNotification("The system failed too many times in retrieving messages, please try again at a later time.");
				}, 1000);
			}
		}
		, addLoadMoreElement: function (html, $container, callback, items) {
			var $element = $(html).appendTo($container);
			var scrollCallback = function () {
				if (!isElementInViewport($element)) return;
				$(window).off('scroll', scrollCallback);
				$element.remove();
				callback(items);
			};
			$(window).on('scroll', scrollCallback);
			scrollCallback();
		}
		, addEditor: function () {
			$(".yair-switch-editor").on('click', function () {
				if ($(".editor-container").hasClass("yair-hide")) { //Show the Visual Editor
					//set quill's inner html to that of the preview window
					$(".ql-editor").html($(".yair-conversation-preview").html());

					$(".editor-container").removeClass("yair-hide");			//Show the visual editor
					$("#markdown").addClass("yair-hide");					//hide the markdown window
					$(".yair-conversation-preview").addClass("yair-hide");	//hide the preview window

					$(".yair-switch-editor").html("Edit Markdown");

				} else { //Show the Markdown Editor
					//set the preview window's html to that of quill's.
					$(".yair-conversation-preview").html($(".ql-editor").html());

					$(".editor-container").addClass("yair-hide");			//hide the visual editor
					$("#markdown").removeClass("yair-hide");					//show the markdown editor
					$(".yair-conversation-preview").removeClass("yair-hide");	//show the markdown preview

					$(".yair-switch-editor").html("Edit Visually");
				}
			});
		}
	};
	yair.controller = {
		resetInbox: function () {
			yair.view.showLoading('Clearing inbox');
			yair.proxy(['yair', 'db', 'clearObjectStore'], [db_tables.privateMessages.name], function () {
				yair.cfg.set('pmInboxInitialized', false);
				yair.controller.reloadInbox();
			});
		}
		, exportConversation: function(e){
			var $ele = $(this);
			var format = $ele.data('format');
			var conversations = [$('.yair-conversation').data('conversation')];
			var data = '';

			for(var i = 0; i < conversations.length; i++) {
				if(i > 0) { data += "\r\n---\r\n---\r\n"; }
				var conversation = conversations[i];
				data += '# ' + conversation.subject + "\r\n\r\n";
				var messages = conversation.messages;
				messages.sort(function(a, b){
					if(a.created_utc === b.created_utc) { return 0; }
					return (a.created_utc > b.created_utc) ? 1 : -1;
				});
				for(var j = 0; j < messages.length; j++) {
					if(j > 0) { data += "\r\n---\r\n"; }
					var message = messages[j];
					data += '## From: ' + message.author + ' | Date: ' + sysDateStr(message.created_utc * 1000) + ' ' + sysTimeStr(message.created_utc * 1000, ':') + "\r\n\r\n";
					data += message.body.replace("\r", "").replace("\n", "\r\n") + "\r\n";
				}
			}

			var dataBlob = new Blob([data], {type : 'text/plain'});
			var downloadUrl = URL.createObjectURL(dataBlob);
			const a = document.createElement('a');
			a.style.display = 'none';
			a.href = downloadUrl;
			var subject = $('.yair-conversation-title').text();
			a.download = subject + '_' + sysDateStr(message.created_utc * 1000) + '_' + sysTimeStr(message.created_utc * 1000, ':') + '.txt';
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(downloadUrl);

		}
		, reindexMessages: function () {
				yair.model.reindexPrivateMessages(function () {
					yair.view.update();
					yair.view.setFavicon();
				}, function (errorMessage) {
					yair.view.showNotification(errorMessage, -1);
					console.error("DB has NOT been updated", arguments);
				});
				yair.controller.reloadInbox();
		}
		, showMessageClick: function () {
			var conversation = $(this).data('conversation');
			history.pushState({}, yair.cfg.data.pageTitle, '/message/yair_conversation/' + conversation.id);
			yair.controller.parseUrl();
			yair.view.showConversation(conversation);
			// Scroll to the top
			window.scrollTo(0, 0);
		}
		, reloadInbox: function () {
			yair.view.showLoading();
			yair.model.updateDb(function () {
				yair.view.update();
				yair.view.setFavicon();
			}, function (errorMessage) {
				yair.view.showNotification(errorMessage, -1);
				console.error("DB has NOT been updated", arguments);
			});
		}
		, search: function (query) {
			history.pushState({}, yair.cfg.data.pageTitle, '/message/yair_inbox?search=' + query);
			yair.view.update();
		}
		, parseUrl: function () {
			delete yair['showid'];
			var pathParts = location.pathname.split('/');
			if (pathParts[2] === "yair_conversation" && pathParts.length >= 4) {
				yair.show = "conversation";
				yair.showid = pathParts[3];
			}
			else if (pathParts[2] === "yair_modarchived") { window.scrollTo(0, 0); yair.show = "modarchived"; }
			else if (pathParts[2] === "yair_modsaved") { window.scrollTo(0, 0); yair.show = "modsaved"; }
			else if (pathParts[2] === "yair_moddrafts") { window.scrollTo(0, 0); yair.show = "moddrafts"; }
			else if (pathParts[2] === "yair_modmail") { window.scrollTo(0, 0); yair.show = "modmail"; }
			else if (pathParts[2] === "yair_saved") { window.scrollTo(0, 0); yair.show = "saved"; }
			else if (pathParts[2] === "yair_archived") { window.scrollTo(0, 0); yair.show = "archived"; }
			else if (pathParts[2] === "yair_drafts") { window.scrollTo(0, 0); yair.show = "drafts"; }
			else { window.scrollTo(0, 0); yair.show = "inbox"; }
			yair._get = parseQueryString(location.search);
			if (yair._get.search) {
				yair._get.searchObj = parseSearchQuery(yair._get.search);
			}
			else if (yair._get.searchObj) {
				delete yair._get['searchObj'];
			}
		}
		, action: {
			get conversations() {
				if (yair.show === "conversation") {
					return [$('.yair-conversation').data('conversation')];
				}
				else if (['inbox', 'drafts', 'saved', 'archived', 'modmail', 'moddrafts', 'modsaved', 'modarchived'].indexOf(yair.show) >= 0) {
					var conversations = [];
					var $checked = $('.yair-message-row .yair-checkbox input[type="checkbox"]:checked');
					$checked.each(function () {
						var $row = $(this).closest('.yair-message-row');
						var conversation = $row.data('conversation');
						conversation.$e = $row;
						conversations.push(conversation);
					});
					return conversations;
				}
			}
			, toggleSave: function (e) {
				var $ele = $(this);
				var id;
				if (yair.show === "conversation") {
					id = $ele.closest('.yair-conversation').data('conversation').id;
				}
				else {
					id = $ele.closest('.yair-message-row').data('conversation').id;
				}
				if ($ele.hasClass('yair-saved')) {
					yair.cfg.saved.remove(id);
					$ele.removeClass('yair-saved');
				}
				else {
					yair.cfg.saved.add(id);
					$ele.addClass('yair-saved');
				}
				e.stopPropagation();
			}
			, delete: function () {
				var conversation = $(this);
				var id;
				if (yair.show === "conversation") {
					id = conversation.closest('.yair-conversation').data('conversation').id;
				}
				else {
					id = conversation.closest('.yair-message-row').data('conversation').id;
				}				
				if (!yair.cfg.deleted.contains(id)) {
					yair.cfg.deleted.add(id);
					conversation.closest(".yair-message-row").find('.styled-checkbox').prop("checked", false);
					if (yair.show !== "archived" || yair.show !== "modarchived") {
						conversation.closest('.yair-message-row').slideUp(function () {
							conversation.closest('.yair-message-row').remove();
						});
					}
				}
				yair.view.showNotification('Archived');
				if (yair.show === "conversation") {
					// Go to inbox
					history.pushState({}, yair.cfg.data.pageTitle, '/message/yair_inbox');
					yair.view.update();
				}
				if(!$('.yair-main-panel .styled-checkbox').is(":checked")) {
					$(".yair-sidebar-options").addClass("yair-hide");
				}
			}
			, bulkDelete: function () {
				var conversations = yair.controller.action.conversations;
				for (var i = 0; i < conversations.length; i++) {
					var conversation = conversations[i];
					var id = conversation.id;
					if (!yair.cfg.deleted.contains(id)) {
						yair.cfg.deleted.add(id);
						if (yair.show === "conversation") {
							history.back();
						}
						else if (yair.show !== "archived" || yair.show !=="modarchived") {
							conversation.$e.slideUp(function () {
								conversation.$e.remove();
							});
						}
					}
				}
				$(".yair-sidebar-options").addClass("yair-hide");
				if (!conversations.length) return;
				yair.view.showNotification('Archived');
				if (yair.show === "conversation") {
					// Go to inbox
					history.pushState({}, yair.cfg.data.pageTitle, '/message/yair_inbox');
					yair.view.update();
				}
				$('.styled-checkbox').prop('checked', false);
			}
			, restore: function (e) {
				var conversation = $(this);
				var id;
				if (yair.show === "conversation") {
					id = conversation.closest('.yair-conversation').data('conversation').id;
				}
				else {
					id = conversation.closest('.yair-message-row').data('conversation').id;
				}
				if (yair.cfg.deleted.contains(id)) {
					yair.cfg.deleted.remove(id);
					conversation.closest(".yair-message-row").find('.styled-checkbox').prop("checked", false);
					if (yair.show === "archived" || yair.show === "modarchived") {
						conversation.closest('.yair-message-row').slideUp(function () {
							conversation.closest('.yair-message-row').remove();
						});
					}
				}
				if(!$('.yair-main-panel .styled-checkbox').is(":checked")) {
					$(".yair-sidebar-options").addClass("yair-hide");
				}
				yair.view.showNotification('Restored');
				if (yair.show === "conversation") {
					// Go to inbox
					history.pushState({}, yair.cfg.data.pageTitle, '/message/yair_inbox');
					yair.view.update();
				}
			}
			, bulkRestore: function () {
				var conversations = yair.controller.action.conversations;
				for (var i = 0; i < conversations.length; i++) {
					var conversation = conversations[i];
					var id = conversation.id;
					if (yair.cfg.deleted.contains(id)) {
						yair.cfg.deleted.remove(id);
						if (yair.show === "archived" || yair.show === "modarchived") {
							conversation.$e.slideUp(function () {
								conversation.$e.remove();
							});
						}
					}
				}
				$(".yair-sidebar-options").addClass("yair-hide");
				if (!conversations.length) return;
				yair.view.showNotification('Restored');
				if (yair.show === "conversation") {
					// Go to inbox
					history.pushState({}, yair.cfg.data.pageTitle, '/message/yair_inbox');
					yair.view.update();
				}
				$('.styled-checkbox').prop('checked', false);
			}
			, save: function () {
				var conversations = yair.controller.action.conversations;
				for (var i = 0; i < conversations.length; i++) {
					var id = conversations[i].id;
					if (!yair.cfg.saved.contains(id)) {
						yair.cfg.saved.add(id);
					}
				}
				if (!conversations.length) return;
				var msg = (conversations.length === 1) ? 'The message was saved' : 'The messages were saved';
				yair.view.showNotification(msg);
			}
			, unsave: function () {
				var conversations = yair.controller.action.conversations;
				for (var i = 0; i < conversations.length; i++) {
					var conversation = conversations[i];
					var id = conversation.id;
					if (yair.cfg.saved.contains(id)) {
						yair.cfg.saved.remove(id);
						if (yair.show === "saved") {
							conversation.$e.slideUp(function () { conversation.$e.remove(); });
						}
					}
				}
				if (!conversations.length) return;
				var msg = (conversations.length === 1) ? 'The message was unsaved' : 'The messages were unsaved';
				yair.view.showNotification(msg);
			}
			, markRead: function () {
				var conversation = $(this).closest('.yair-message-row');
				conversation.removeClass('yair-unread');
				conversation.addClass('yair-read');
				yair.model.setConversationStatus(conversation.data('conversation'), true);
			}
			, markUnread: function () {
				var conversation = $(this).closest('.yair-message-row');
				conversation.addClass('yair-unread');
				conversation.removeClass('yair-read');
				yair.model.setConversationStatus(conversation.data('conversation'), false);
			}
			, bulkMarkRead: function () {
				var conversations = yair.controller.action.conversations;
				for (var i = 0; i < conversations.length; i++) {
					var conversation = conversations[i];
					if (conversation.$e) {
						conversation.$e.removeClass('yair-unread');
						delete conversation['$e'];
					}
					yair.model.setConversationStatus(conversation, true);
				}
				$(".yair-sidebar-options").addClass("yair-hide");
				if (!conversations.length) return;
				if (yair.show === "conversation") {
					// Go to inbox
					yair.view.showNotification('Marked read');
					history.pushState({}, yair.cfg.data.pageTitle, '/message/yair_inbox');
					yair.view.update();
				}
				else {
					// Deselect selected items
					var $rows = $('.yair-message-row.yair-row-checked');
					$rows.removeClass('yair-row-checked');
					$('.styled-checkbox').prop('checked', false);
				}
			}
			, bulkMarkUnread: function () {
				var conversations = yair.controller.action.conversations;
				for (var i = 0; i < conversations.length; i++) {
					var conversation = conversations[i];
					if (conversation.$e) {
						conversation.$e.addClass('yair-unread');
						delete conversation['$e'];
					}
					yair.model.setConversationStatus(conversation, false);
				}
				$(".yair-sidebar-options").addClass("yair-hide");
				if (!conversations.length) return;
				if (yair.show === "conversation") {
					// Go to inbox
					yair.view.showNotification('Marked unread');
					history.pushState({}, yair.cfg.data.pageTitle, '/message/yair_inbox');
					yair.view.update();
				}
				else {
					// Deselect selected items
					var $rows = $('.yair-message-row.yair-row-checked');
					$rows.removeClass('yair-row-checked');
					$('.styled-checkbox').prop('checked', false);
				}
			}
		}
	};
	yair.model = {
		setConversationStatus: function (conversation, read) {
			var updated = [];
			for (var i = 0; i < conversation.messages.length; i++) {
				if (conversation.messages[i]['new'] === read) {
					conversation.messages[i]['new'] = !read;
					updated.push(conversation.messages[i]);
				}
			}
			if (updated.length > 0) {
				yair.proxy(['yair', 'db', 'updateAll'], [db_tables.privateMessages.name, updated]);
			}
		}
		, showModmailInInbox: function (filteredConversations) {
			if (yair.cfg.data.showModmail) {
				$(".yair-modmail").removeClass("yair-hide");
				if(['modmail', 'moddrafts', 'modsaved', 'modarchived'].indexOf(yair.show) >= 0) {
					yair.model.modmailFilter(filteredConversations, true);
				} else { yair.model.modmailFilter(filteredConversations, false); }
			} else { $(".yair-modmail").addClass("yair-hide"); }
		}
		, modmailFilter: function (conversations, modDirectory) {
			for (var i = 0; i < conversations.length; i++) {
				var conversation = conversations[i];
				if (modDirectory) { if (!conversation.modmail) { conversations.splice(i--, 1); }
				} else { if (conversation.modmail) { conversations.splice(i--, 1); } }
			}
		}
		, directoryFilter: function (conversations, directory) {
			if (typeof directory === "undefined") {
				directory = yair.show;
			}
			yair.proxy(['drafts', 'getAllKeys'], [], function (draftsKeys) {
				yair.model.cache.draftsKeys = draftsKeys;
				for (var i = 0; i < conversations.length; i++) {
					var conversation = conversations[i];
					var saved = yair.cfg.saved.contains(conversation.id);
					var archived = yair.cfg.deleted.contains(conversation.id);
					var drafts = (yair.model.cache.draftsKeys.indexOf(conversation.id) >= 0);
					var modmail = conversation.modmail;
					if (directory !== "archived" && directory !== "modarchived"  && archived  ||
						directory === "saved"       && !saved    ||
						directory === "archived"    && !archived ||
						directory === "drafts"      && !drafts   ||
						directory === "modsaved"    && !saved    ||
						directory === "moddrafts"   && !drafts   ||
						directory === "modarchived" && !archived
					   ) { conversations.splice(i--, 1); }
				}
			});
		}
		, searchFilter: function (conversations) {
			if (!yair._get.searchObj) return;
			for (var i = 0; i < conversations.length; i++) {
				var conversation = conversations[i];
				if (!yair.model.searchMatchCheck(conversation)) {
					conversations.splice(i--, 1);
				}
			}
		}
		, searchMatchCheck: function (conversation) {
			var searchObj = yair._get.searchObj;
			if (searchObj.from && conversation.correspondent && searchObj.from.toLowerCase() === conversation.correspondent.toLowerCase()) {
				return true;
			}
			if (searchObj.subject) {
				var subject = conversation.subject.toLowerCase();
				var terms = yair._get.searchObj.subject;
				var termsFound = 0;
				for (var j = 0; j < terms.length; j++) {
					var term = terms[j].toLowerCase();
					if (subject.indexOf(term) >= 0) {
						termsFound++;
					}
				}
				if (termsFound >= terms.length) {
					return true;
				}
			}
			if (searchObj.message) {
				var terms = searchObj.subject;
				var termsFound = 0;
				for (var j = 0; j < terms.length; j++) {
					for (var k = 0; k < conversation.messages.length; k++) {
						var message = conversation.messages[k].body.toLowerCase();
						var term = terms[j].toLowerCase();
						if (message.indexOf(term) >= 0) {
							termsFound++;
							break;
						}
					}
				}
				if (termsFound >= terms.length) {
					return true;
				}
			}
			return false;
		}
		, cloneAndSortConversations: function (conversations, oldToNew) {
			if (typeof oldToNew === "undefined") {
				oldToNew = true;
			}
			var clone = JSON.parse(JSON.stringify(conversations));
			clone.sort(function (a, b) {
				if (a.last_update === b.last_update) return 0;
				return (a.last_update > b.last_update) ? 1 : -1;
			});
			for (var i = 0; i < clone.length; i++) {
				clone[i].messages.sort(function (a, b) {
					if (a.created_utc === b.created_utc) return 0;
					return (a.created_utc > b.created_utc) ? 1 : -1;
				});
			}
			return clone;
		}
		, getConversationContexts: function (conversations) {
			var contexts = [];
			for (var i = 0; i < conversations.length; i++) {
				var context = JSON.parse(JSON.stringify(conversations[i]));
				delete context.messages;
				contexts.push(context);
			}
			return contexts;
		}
		, removeConversationContexts: function (conversations) {
			var messages = [];
			for (var i = 0; i < conversations.length; i++) {
				var conversation = conversations[i];
				for (var j = 0; j < conversation.messages.length; j++) {
					messages.push(conversation.messages[j]);
				}
			}
			return messages;
		}
		, cache: {
			conversations: []
			, draftsKeys: []
			, hideOverlay: false
		}
	};
	yair.markdown = SnuOwnd.getParser();
	yair.init.start();
	yair.init.executeAfter(['DOMReady', 'preloadTemplatesReady'], function () {
		// The DOM is ready and templates have been preloaded
		// Don't do anything if it's a 503
		if (document.title.indexOf("Ow!") >= 0) return;
		if (!isLoggedIn()) return;
		// Parse the URL
		yair.controller.parseUrl();
		yair.functions.initConfig(function () {
			// Initialize default layout elements
			yair.view.setFavicon();
			yair.view.initLayout(); // To set the page title, we need our config
			yair.view.bindActionButtons();
			yair.view.showLoading();
			yair.proxy(['yair', 'db', 'init'], [], yair.controller.reloadInbox);
		});
	});
})(jQuery);