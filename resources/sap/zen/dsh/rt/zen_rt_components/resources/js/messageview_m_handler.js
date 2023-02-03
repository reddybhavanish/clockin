define("zen.rt.components/resources/js/messageview_m_handler", ["sap/zen/basehandler"], function(BaseHandler){
	
	sap.zen.MessageViewHandler = function() {
		"use strict";
	
		BaseHandler.apply(this, arguments);
		
		var dispatcher = BaseHandler.dispatcher;
	
		var that = this;
		
		sap.zen.MessageViewHandler.info = "INFO";
		sap.zen.MessageViewHandler.warning = "WARNING";
		sap.zen.MessageViewHandler.error = "ERROR";
		
		var mainMessageviewId = sap.zen.Dispatcher.instance.dshPrefix + "MESSAGE_messageview1";
		var footerBarId = sap.zen.Dispatcher.instance.dshPrefix + "FOOTERBAR_footerbar";
		var panelBodyId = sap.zen.Dispatcher.instance.dshPrefix + "PANEL_BODY_panel1";
		
		this.oMessageView;
		
		this.oldMessagesAfterVarScreen = [];
		
		/**
		 * Create Control
		 */
		this.createAndAdd = function(phxObj, controlData, componentData, fInsertIntoParentFunclet, iIndex) {
			var loControl = this.create(phxObj, controlData, componentData);
			if (fInsertIntoParentFunclet) {
				fInsertIntoParentFunclet(loControl, iIndex, componentData);
			}
			sap.zen.Dispatcher.instance.updateComponentProperties(loControl, componentData, fInsertIntoParentFunclet);
			return loControl;
		};
		
		this.create = function(oChainedControl, oControlProperties) {
			$.sap.require("sap.ui.core.IconPool");
			
			this.sLogCommand = oControlProperties.log_command;
			
			var lId = oControlProperties["id"];
			
			this.oMessageView = new sap.zen.MessageViewHandler.MessageView(lId, null, _handleMessageView_onAfterUpdate, _handleMessageView_onAfterRendering);
			
			var loMsgBtn = this.oMessageView.getMessageButton();
			this.init(loMsgBtn, oControlProperties);
			
			return loMsgBtn;
		};
		
		/**
		 * Update Control
		 */
		this.update = function(oControl, oControlProperties) {
			if (oControlProperties) {
				var loMsgBtn = oControl;
				this.init(oControl, oControlProperties);
			}
		};
		
		/**
		 * Initialize Control (Create, Update)
		 */
		this.init = function(oControl, oControlProperties) {
			this.oMessageView.init(oControlProperties.messages);
		};
		
		/**
		 * Update FooterBar
		 */
		this.updateFooterBar = function(oMsgBtn) {
			if (mainMessageviewId !== oMsgBtn.getId()) {
				return;
			}
			
			var loFooter = sap.ui.getCore().byId(footerBarId);
			var loPanelBody = sap.ui.getCore().byId(panelBodyId);
			if (loFooter && loPanelBody) {
				var lVisible = oMsgBtn.getVisible();
				loFooter.setHeight(lVisible ? "40px" : "0px");
				var lPosition = loPanelBody.getPositions()[0];
				var lPositionBottom = lPosition.getBottom();
				if (lVisible && lPositionBottom !== "40px") {
					lPosition.setBottom("40px");
					loPanelBody.invalidate();
				}
				if (!lVisible && lPositionBottom !== "0px") {
					lPosition.setBottom("0px");
					loPanelBody.invalidate();
				}
			}
		};
		
		/**
		 * Handle MessageView - OnAfterRendering
		 */
		function _handleMessageView_onAfterRendering() {
			if (this.oMessageView.onAfterRenderingOriginal) {
				this.oMessageView.onAfterRenderingOriginal();
			}
			
			if (!instance.varScreenMode) {
				var oJqUi5BlockLayer = $('#sap-ui-blocklayer-popup');
				var jqMsgBtn = loMsgBtn.$();
				
				if (oJqUi5BlockLayer && oJqUi5BlockLayer.length > 0
						&& oJqUi5BlockLayer.css("visibility") === "visible" 
							&& oJqUi5BlockLayer.outerWidth() > 0 && oJqUi5BlockLayer.outerHeight() > 0) {
					
					var sZIndex = oJqUi5BlockLayer.css("z-index");
					if (sZIndex && sZIndex.length > 0) {
						var iZIndex = parseInt(sZIndex, 10);
						jqMsgBtn.css("z-index", "" + (iZIndex + 1));
					}
				} else {
					jqMsgBtn.css("z-index", "auto");
				}
			}
		};

		/**
		 * Handle MessageView - OnAfterUpdate
		 */
		function _handleMessageView_onAfterUpdate(oMessageView) {
			var loMsgBtn = oMessageView.getMessageButton();
			instance.updateFooterBar(loMsgBtn);
		};
		
		/**
		 * Handle MessageView - OnAfterInitMessages
		 */
		function _handleMessageView_onAfterInitMessages(oMessageView, handled) {
			if (sap.zen.MessageViewHandler.oldMessagesAfterVarScreen && !instance.varScreenMode) {
				// restoring old messages is only necessary when not on the variable screen
				// this failed when opening a var screen without any messages on the var screen initially,
				// because it still showed the "main app" messages
				var ltResult = sap.zen.MessageViewHandler.oldMessagesAfterVarScreen.slice();
				delete sap.zen.MessageViewHandler.oldMessagesAfterVarScreen;
				
				handled = true;
				return ltResult;
			}
		};
		
		/**
		 * Remove
		 */
		var super_remove = this.remove;
		this.remove = function(oControl){
			if (oControl.oMsgPopover){
				oControl.oMsgPopover.destroy();
			}
			super_remove.apply(this,arguments);
		};
		
		/**
		 * Set Variable Screen
		 */
		sap.zen.MessageViewHandler.setVariableScreen = function(bMode){
			if(bMode){
				var loMsgBtn = sap.ui.getCore().byId(instance.oMessageView.getMessageButton().getId())
				if(loMsgBtn){
					this.oldMessagesAfterVarScreen = loMsgBtn.oMsgPopover.getModel().getData();
				}
			}
			instance.varScreenMode = bMode;
		};
		
		/**
		 * Get Highest Message Level
		 */
		this.getHighestMessageLevel = function(oModel){
			instance.oMessageView.getHighestMessageLevel(oModel);
		};
		
		/**
		 * Create Message
		 */
		sap.zen.MessageViewHandler.createMessage = function(level, shortText, longText, logMessage) {
			instance.oMessageView.createMessage(level, shortText, longText, logMessage);
		};
		
		/**
		 * Log Message
		 */
		sap.zen.MessageViewHandler.logMessage = function(level, shortText, longText) {
			instance.oMessageView.logMessage(level, shortText, longText);
		};
		
		/**
		 * Clear Messages
		 */
		sap.zen.MessageViewHandler.clearMessages = function() {
			instance.oMessageView.clearMessages();
		};
		
		/**
		 * Utility: Message Button Handling
		 */
		sap.zen.MessageViewHandler.MessageView = function(id, tMessages, oFuncOnAfterUpdate, oFuncOnAfterRendering, oFuncOnAfterInitMessages){
			var that = this;
			
			this.id = id;
			this.oMsgButton = null;
			this.logCommand;
			
			/**
			 * Get ID
			 */
			this.getId = function() {
				return this.id;
			};
			
			/**
			 * Get Message Button Control
			 */
			this.getMessageButton = function() {
				return this.oMsgButton;
			};
			
			/**
			 * Handle: OnAfterUpdate
			 */
			this.onAfterUpdate = function() {
				// nothing
			};
			
			/**
			 * Handle: OnAfterRendering
			 */
			this.onAfterRendering = function() {
				if (!that.oMsgButton.oOriginalFuncOnAfterRendering) {
					that.oMsgButton.oOriginalFuncOnAfterRendering();
				}
			};
			
			this.onAfterInitMessages = function() {
				// nothing
			};
						
			/**
			 * Create Message Button Control
			 */
			function _create(id, tMessages, oFuncOnAfterUpdate, oFuncOnAfterRendering, oFuncOnAfterInitMessages) {
				// destroy old Message Button
				var loOldMsgBtn = sap.ui.getCore().byId(id);
				if (loOldMsgBtn) {
					loOldMsgBtn.destroy();
				}
				
				// create new Message Button
				var loMsgBtn = new sap.m.Button({
					id: id,
					icon: sap.ui.core.IconPool.getIconURI("message-popup"),
					text: "{/count}",
					type: sap.m.ButtonType.Emphasized,
					press: function () {
						this.oMsgPopover.toggle(this);
					}
				});
				
				var loMessageTemplate = new sap.m.MessagePopoverItem({
				    type: '{type}',
				    title: '{title}',
				    description: '{description}'
				  });
				
				var loMessageHeaderButton = new sap.m.Button({
					icon: "sap-icon://delete",
					press: function () {
						loMsgBtn.oMsgPopover.getModel().setData([]);
						loMsgBtn.setVisible(false);
						that.onAfterUpdate(that);
					}
				});

				loMsgBtn.oMsgPopover = new sap.m.MessagePopover({
				    items: {
				        path: '/',
				        template: loMessageTemplate
					},
					headerButton: loMessageHeaderButton
				});
				
				_attachOnAfterUpdate(oFuncOnAfterUpdate);
				_attachOnAfterRendering(loMsgBtn, oFuncOnAfterRendering);
				_attachOnAfterInitMessages(oFuncOnAfterInitMessages);
				
				that.oMsgButton = loMsgBtn;
				
				_init(loMsgBtn, tMessages);
				
				return loMsgBtn;
			};
			
			/**
			 * Attach OnAfterUpdate
			 */
			function _attachOnAfterUpdate(oFunc) {
				if (!that.onAfterUpdateOriginal) {
					that.onAfterUpdateOriginal = that.onAfterUpdate;
				}
				if (oFunc) {
					that.onAfterUpdate = oFunc;
				}
			};
			
			/**
			 * Attach OnAfterRendering
			 */
			function _attachOnAfterRendering(oMsgButton, oFunc) {
				if (!that.onAfterRenderingOriginal) {
					that.onAfterRenderingOriginal = that.onAfterRendering;
				}
				if (oFunc) {
					that.onAfterRendering = oFunc;
				}
				
				if (!oMsgButton.oOriginalFuncOnAfterRendering) {
					oMsgButton.oOriginalFuncOnAfterRendering = oMsgButton.onAfterRendering;
				}
				oMsgButton.onAfterRendering = that.onAfterRenderingOriginal;		
			};
			
			/**
			 * Attach OnAfterInitMessages
			 */
			function _attachOnAfterInitMessages(oFunc) {
				if (!that.onAfterInitMessagesOriginal) {
					that.onAfterInitMessagesOriginal = that.onAfterInitMessages;
				}
				if (oFunc) {
					that.onAfterInitMessages = oFunc;
				}
			}
			
			/**
			 * Initialize Message Button Control
			 */
			this.init = function(tMessages) {
				_init(this.oMsgButton, tMessages);
			};
			
			function _init(oMsgButton, tMessages) {
				var loModel, ltPreviousModelData = [];
				if (oMsgButton.oMsgPopover) {
					loModel = oMsgButton.oMsgPopover.getModel();
					if (loModel) {
						var loData = loModel.getData();
						if (loData) {
							ltPreviousModelData = loData;
						}
					}
				}
				
				var ltMessages = convertMessageFormatToUi5(ltPreviousModelData, tMessages);		
				if (oMsgButton.oMsgPopover.getModel()) {
					oMsgButton.oMsgPopover.getModel().setData(ltMessages);
				} else {
					loModel = new sap.ui.model.json.JSONModel();
					loModel.setData(ltMessages);
					oMsgButton.oMsgPopover.setModel(loModel);
				}
				
				_update(oMsgButton);
			};
			
			/**
			 * Update Message Button Control
			 */
			this.update = function() {
				_update(this.oMsgButton);
			};
			
			function _update(oMsgButton) {
				var lMessageCount = oMsgButton.oMsgPopover.getModel().getData().length;
				oMsgButton.setText(lMessageCount);
				oMsgButton.setVisible((oMsgButton.oMsgPopover.getModel().getData() && lMessageCount > 0));
				
				that.onAfterUpdate(that);
			};
			
			/**
			 * Convert Messages
			 */
			function convertMessageFormatToUi5(tModelMessages, tNewMessages) {
				var ltMessages = tModelMessages;
				var ltOldMessages = tNewMessages;
				
				if (ltOldMessages && ltOldMessages.length > 0) {
					for (var i = 0; i < ltOldMessages.length; i++) {
						var loOldMessage = ltOldMessages[i].message;
						var loNewMessage = {};
						if (loOldMessage.level === "ERROR") {
							loNewMessage.type = "Error";
						} else if (loOldMessage.level === "WARNING") {
							loNewMessage.type = "Warning";
						} else {
							loNewMessage.type = "Information";
						}
						loNewMessage.title = loOldMessage.short_text;
						loNewMessage.description = loOldMessage.long_text;
						
						ltMessages.push(loNewMessage);
					}
				} else {
					if (_isHanaRuntime()) {
						// the message view in the "main app" is not removed when opening a var screen in the hana runtime
						// therefore, no need to restore messages when closing the var screen
						if (ltMessages) {
							return ltMessages;
						} else {
							return []; // initial rendering
						}
					}
					
					var lHandled = false;
					var ltResult = that.onAfterInitMessages(that, lHandled);
					if (lHandled) {
						return ltResult;
					}
					
					return []; //initial rendering
				}
				
				return ltMessages;
			};
			
			/**
			 * Check if HanaRuntime
			 */
			function _isHanaRuntime() {
				if(typeof (DSH_deployment) !== "undefined"){
					return true;
				} else {
					return false;
				}
			};
			
			/**
			 * Get Highest Message Level
			 */
			this.getHighestMessageLevel = function(oModel) {
				var ltMessages = oModel.getData();
				
				var lWarningFound = false;
				for(var i = 0; i < ltMessages.length; i++){
					var loMessage = ltMessages[i];
					if (loMessage.type === "Error"){
						return "message-error";
					} else if (loMessage.type === "Warning"){
						lWarningFound = true;
					}
				}
				
				if(lWarningFound){
					return "message-warning";
				}
				
				return "message-information";
			};
			
			/**
			 * Create Message
			 */
			this.createMessage = function(level, shortText, longText, logMessage) {
				if (!this.oMsgButton) {
					return;
				}
				
				var loNewMessage = {};
				if (level === "ERROR") {
					loNewMessage.type = "Error";
				} else if (level === "WARNING") {
					loNewMessage.type = "Warning";
				} else {
					loNewMessage.type = "Information";
				}
				loNewMessage.title = shortText;
				loNewMessage.description = longText;
				
				var loModel;
				if (this.oMsgButton.oMsgPopover && this.oMsgButton.oMsgPopover.getModel()) {
					loModel = this.oMsgButton.oMsgPopover.getModel()
					loModel.setData([ loNewMessage ]);
				} else {
					loModel = new sap.ui.model.json.JSONModel();
					loModel.setData([ loNewMessage ]);
					loModel.oMsgPopover.setModel(oModel);
				}
				
				this.update();
				
				if (logMessage) {
					this.logMessage(level, shortText, longText);
				}
			};
			
			/**
			 * Log Message
			 */
			this.logMessage = function(level, shortText, longText) {
				if (this.logCommand) {
					var lsCommand = this.logCommand;
					lsCommand = sap.zen.Dispatcher.instance.prepareCommand(lsCommand, "__LEVEL__", level);
					lsCommand = sap.zen.Dispatcher.instance.prepareCommand(lsCommand, "__SHORTTEXT__", shortText);
					lsCommand = sap.zen.Dispatcher.instance.prepareCommand(lsCommand, "__LONGTEXT__", longText);
		
					var loFuncAction = new Function(lsCommand);
					loFuncAction();
				}
			};
			
			/**
			 * Clear Messages
			 */
			this.clearMessages = function() {
				if (!this.oMsgButton) {
					return;
				}
				
				if (this.oMsgButton.oMsgPopover && this.oMsgButton.oMsgPopover.getModel()) {
					var loModel = this.oMsgButton.oMsgPopover.getModel()
					loModel.setData([]);
					
					this.update();
				}
			};
			
			/**
			 * Start Creating the Message Button
			 */
			this.oMsgButton = _create(id, tMessages, oFuncOnAfterUpdate, oFuncOnAfterRendering, oFuncOnAfterInitMessages);
		} // MesssageView Helper
		
	}; // MessageView Handler
	
	var instance = new sap.zen.MessageViewHandler();
	sap.zen.Dispatcher.instance.addHandlers("messageview", instance);
	return instance;
});