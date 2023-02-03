// Copyright (c) 2009-2020 SAP SE, All Rights Reserved
sinaDefine(['../core/core','./ResultSetItem'],function(c,R){"use strict";return R.derive({_meta:{properties:{dimensionValueFormatted:{required:true},measureValue:{required:true},measureValueFormatted:{required:true}}},toString:function(){return this.dimensionValueFormatted+':'+this.measureValueFormatted;}});});
