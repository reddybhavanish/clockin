// Copyright (c) 2009-2020 SAP SE, All Rights Reserved
sinaDefine(['../../core/core'],function(c){"use strict";return c.defineClass({initAsync:function(){},format:function(o){return o;},formatAsync:function(o){o=this.format(o);return c.Promise.resolve(o);}});});
