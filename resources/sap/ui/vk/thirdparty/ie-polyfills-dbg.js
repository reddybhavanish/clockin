
	if (!Uint8Array.prototype.slice) {
		// IE11 polyfill
		Object.defineProperty(Uint8Array.prototype, "slice", {
			value: function(begin, end) {
				return new Uint8Array(Array.prototype.slice.call(this, begin, end));
			}
		});
	}

	if (!Uint8Array.prototype.indexOf) {
		// IE11 polyfill
		Object.defineProperty(Uint8Array.prototype, "indexOf", {
			value: function(obj, start) {
				for (var i = (start || 0), j = this.length; i < j; i++) {
					if (this[i] === obj) { return i; }
				}
				return -1;
			}
		});
	}

	if (!Array.prototype.includes) {
		// IE11 polyfill
		Object.defineProperty(Array.prototype, "includes", {
			enumerable: false,
			value: function(obj) {
				var newArr = this.filter(function(el) {
					return el == obj;
				});
				return newArr.length > 0;
			}
		});
	}

