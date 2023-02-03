/*
 * Copyright (C) 2009-2018 SAP SE or an SAP affiliate company. All rights reserved.
 */
jQuery.sap.declare("edu.weill.Timeevents.utils.formatter");
edu.weill.Timeevents.utils.formatter = (function() {
	return {
		init: function(resourseBundle) {
			this.resourceBundle = resourseBundle;
		},

		isRequired: function(value) {
			if (value === "" || value === null || value === undefined) {
				return false;
			} else return true;
		},

		DATE_YYYYMMdd: function(oDate) {

			if (oDate === undefined)
				return "";

			var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
				pattern: "YYYY-MM-dd"
			});

			return oDateFormat.format(oDate);
		},
		formatTime: function(oTime) {
			if (oTime) {
				var sec = oTime / 1000;
				var mins = oTime / 60000;
				var h = Math.floor(mins / 60).toString();
				if (h.length === 1) {
					h = "0" + h;
				}
				var m = (mins % 60).toFixed(0);
				if (m.length === 1) {
					m = "0" + m;
				}

				var s = (sec % 60).toFixed(0);
				if (s.length === 1) {
					s = "0" + s;
				}
				var timeString = h + ":" + m + ":" + s;
				var dateType = new Date();
				dateType.setHours(h);
				dateType.setMinutes(m);
				dateType.setSeconds(s);
				timeString = this.timeFormatter.format(dateType);
				return timeString;
			}
		},

	};

}());