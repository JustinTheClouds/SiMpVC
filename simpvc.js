$.fn.serializeObject = function() {
	var o = {};
	var a = this.serializeArray();
	$.each(a, function() {
		if (o[this.name] !== undefined) {
			if (!o[this.name].push) {
				o[this.name] = [o[this.name]];
			}
			o[this.name].push(this.value || '');
		} else {
			o[this.name] = this.value || '';
		}
	});
	return o;
};

/**
 * A SIMPLE front end MVC framework using jquery
 *
 * SiMpVC plays very well with PhoneGap and Titanium.
 * It brings a lot of MVC greatness to the front end with a lot less overhead
 * compared to other solutions.
 *
 * Contribute here - 
 * Donate here - 
 *
 * Resources
 * jQuery - http://jquery.com/
 * underscore - http://underscorejs.org/
 *
 */
var SiMpVC = {
	
	/**
	 * Define if debug mode is active or not
	 */
	debug: false,
	/**
	 * SiMpVC logging method, used during debug mode
	 */
	log: function(data, title, type) {
		if(SiMpVC.debug && typeof console.log == 'function') {
			if(type == 'start') {
				var isStart = true;	
				type = 'log';
			}
			if(type == 'end') {
				var isEnd = true;	
				type = 'log';
			}
			if(typeof type == 'undefined') var type = 'log';
			if(isStart) console.log('');
			console[type](data);
			if(isStart) console.log('----------------------------------');
			if(isEnd) {
				console.log('----------------------------------');
				console.log('----------------------------------');
				console.log('');
			}
		}
	},
	/**
	 * Default element to load the controller view into
	 *
	 * This can be overwritten on a controller basis by defining the
	 * SiMpVC.loadInto property.
	 *
	 * This value must a valid jquery selector
	 *
	 */
	defaultLoadInto: 'body',
	/**
	 * Current controller name
	 */
	currentController: null,
	/**
	 * Current controller object
	 */
	controller: null,
	/**
	 * Global methods shared across all controllers
	 */
	controllerMethods: {},
	/**
	 * Current model object
	 */
	model: null,
	/**
	 * Global methods shared across all controllers
	 */
	modelMethods: {},
	/**
	 * Current view before template vars are parsed
	 */
	view: null,
	viewStates: {},
	/**
	 * Current view after template vars are parsed,
	 * null if rendering has not occured for this view yet
	 */
	renderedView: null,
	/**
	 * All loaded controllers
	 */
	controllers: {},
	/**
	 * All Loaded models
	 */
	models: {},
	/**
	 * All loaded views before templates vars are parsed
	 */
	views: {},
	
	init: function() {
		
		SiMpVC.log('Initializing SiMpVC', null, 'start');
		
		// Grab plugin requests
		var defs = [];
		for(e in SiMpVC.plugins) {
			defs.push($.getScript(SiMpVC.plugins[e]));	
		}
		// Load plugins
		SiMpVC.whenCompleted(defs, function() {
			SiMpVC.log('Plugins loaded');
			SiMpVC.log('Initialization complete', null, 'end');
			SiMpVC.loadController('index');		
		});
		
	},
	
	controllerTrigger: function() {
		
		// Unbind any previous clicks before binding again
		$(document).unbind('click').on('click', '.trigger', function(e) {
								
			e.preventDefault();
			e.stopPropagation();
			
			// Make sure we have an action to handle
			if(!$(this).is('[data-action]') || !$(this).data('action')) {
				SiMpVC.log('You must define the "data-action" attribute on any elements given the "trigger" class', 'Error: undefined data-action attribute', 'error');	
				return;
			}
			
			// Get the action name
			var actionName = $(this).data('action');

			// Get the event data
			var data = $(':input[data-action~=' + actionName + ']').serializeObject();

			// Does this event have an identifier?
			if(actionName.indexOf('_') != -1) {
				var actionSplit = actionName.split('_');
				actionName = actionSplit[0];
				data.key = actionSplit[1];
			}
			
			// Fire the action
			SiMpVC.fireAction(actionName, data, e);
			
		});
		
	},
	
	fireAction: function(action, data, e) {
		var caller = SiMpVC.controllers[SiMpVC.currentController][action];
		if(typeof caller == 'function') {
			SiMpVC.controllers[SiMpVC.currentController][action](data, e);
		} else {
			SiMpVC.log('Please define the "' + action + '" function in the "' + SiMpVC.currentController + '" controller', 'Error: undefined action', 'error');	
		}
	},
	
	plugins: {},
	addPlugin: function(name, url) {
		SiMpVC.plugins[name] = url;
	},
	hooks: {},
	addHook: function(hook, callback, priority) {
		// Check if this is the first hook
		if(typeof SiMpVC.hooks[hook] == 'undefined') {
			// Create this hook
			SiMpVC.hooks[hook] = [];
		}
		// If a priority was set, splice the callback into the corresponsing priority
		if(typeof priority != 'undefined') {
			
		// Push this callback into this hook array
		} else {
			SiMpVC.hooks[hook].push(callback);
		}
	},
	removeHook: function(hook) {
		delete SiMpVC.hooks[hook];
	},
	doHooks: function(hook, args) {
		// Start debug logs for current hook
		SiMpVC.log('Do hooks for ' + hook, null, 'start');
		// Do we have any hooks for this hook?
		if(typeof SiMpVC.hooks[hook] != 'undefined') {
			// Debug log for hooks discovered
			SiMpVC.log(SiMpVC.hooks[hook].length + ' Hooks found for ' + hook);
			SiMpVC.log('Executing hooks...');
			
			var hooks = SiMpVC.hooks[hook];
			var ret = args;
			// Loop each hook
			for(e in hooks) {
				// Make sure this hook is a function
				if(typeof hooks[e] == 'function') {
					// Grab return value from hook and merge with previous returned values
					ret = $.extend(ret, hooks[e](args));	
				}
			}
			// Debug log for hook completion
			SiMpVC.log('Completed hooks for ' + hook, null, 'end');
			// Return modified data if defined, otherwise return default data passed in
			return typeof ret == 'undefined' ? args : ret;
		} else {
			// Debug log for hook completion			
			SiMpVC.log('No hooks found for ' + hook);	
			SiMpVC.log('Completed hooks for ' + hook, null, 'end');
			// Return default data passed in
			return args;
		}
	},
	
	/**
	 * Load a controller
	 *
	 * This will load the specified controllers model, view and
	 * controller files. Once all 3 are loaded, the models init method will be
	 * called. The init method may return a deferred object or array of deferred
	 * object to wait for. Or nothing. Once all deferred objects are resolved
	 * from the model.init method. The controller.init method will execute
	 * followed immediately by the rendering and display of the view.
	 *
	 * It's important to note if any ajax data is required before the view
	 * is rendered and displayed, it should be requested in one of the
	 * deferred objects returned from the model.init method.
	 *
	 * @param arg1(required) <string|object> The controller name or an object containing 
	 *     the loadController options.
	 *     Options Available:
	 *     - name(required): the controller name to load
	 *     - callback: a cotroller callback to be called at the end of controller init
	 *     - loadInto: the jquery selector to load the controller into
	 *     - renewView(default false): Whether to load the saved state of a previously loaded view or 
	 *       renew view with the defined vars in the model
	 */
	loadController: function (opts) {
		
		// If first arg is not and object, then pull controller name and callback and set opts
		if(typeof arguments[0] != 'object') {
			var opts = {
				name: arguments[0],
				callback: arguments[1]	
			};
		}
		
		// Make sure we have a controller to laod
		if(typeof opts.name != 'string') {
			SiMpVC.log('A controller name must be defined as the first parameter or opts.name', 'undefined opts.name', 'error');
			return;	
		}
		
		// Run onLoadController hook to allow opts to be modified prior to controller loading
		opts = SiMpVC.doHooks('onLoadController', opts);
		// Run onLoadController hook to allow opts to be modified prior to controller loading
		opts = SiMpVC.doHooks('onLoadController_' + opts.name, opts);
		// Set the current controller
		SiMpVC.currentController = opts.name;

		// Load the model, view and controllers objects, once completed, execute the model init method
		SiMpVC.whenCompleted(SiMpVC.getModel(opts.name), SiMpVC.getController(opts.name), SiMpVC.getView(opts.name), function() {
						
			// Execute model init function
			// This allows us to wait on ajax requests ran from within the model.init method
			// Simply return the deferred ajax request from within the init method
			// or even an array of deferred objects will work
			// Once all are resolved/rejected, then the callback will be executed
			// Then the controller init method will run	and the view will be displayed
			SiMpVC.whenCompleted(SiMpVC.model.init(), function() {
			
				// Debug the initialization of controller
				SiMpVC.log('Initializing ' + opts.name + ' controller', null, 'start');
				
				// If a controller init method returns false, then cancel controller rendering
				if(SiMpVC.controller.init(SiMpVC.controller) === false) {
					SiMpVC.log('Controller ' + opts.name + ' cancelled', null, 'start');
					SiMpVC.log('Initialization of ' + opts.name + ' complete', null, 'end');
					return;
				}
				
				// Grab the controller object and extend it with any additional options passed in
				var controller = $.extend({
					vars: SiMpVC.get()
				}, SiMpVC.controller, opts);
				
				// Debug the controller object after intialization and before display
				SiMpVC.log('Controller Object');
				SiMpVC.log(controller);
				SiMpVC.log('Initialization of ' + opts.name + ' complete', null, 'end');

				// Display the view
				SiMpVC.getTemplate(controller);
								
			});
		});
	
	},
		
	createController: function(name, props) {
		
		var defaults = {
			name: name,
			isController: true,
			loadInto: SiMpVC.defaultLoadInto,
			init: function() {},
			/**
			 * Use this hook to modify the DOM after temmplate vars have been parsed
			 * but before it has been shown to the user
			 */
			afterRender: function(renderedView) {},
			/**
			 * Use this to modify the DOM after it has been displayed to the user
			 */
			afterDisplay: function(displayedView) {},
		};
		
		$.extend(defaults, SiMpVC.controllerMethods, props);
		
		return SiMpVC.controllers[name] = defaults;
	},
	
	getController: function(name) {
		
		if(typeof SiMpVC.controllers[name] != 'undefined') return SiMpVC.controller = SiMpVC.controllers[name];
		
		return $.ajax({
			url: 'controllers/'+name+'.js',
			dataType: 'script',
			cache: !SiMpVC.debug // Disable caching if ind ebug mode
		}).always(function() {

			// Cache the loaded controller if its defined, otherwise create a default controller	
			SiMpVC.controllers[name] = ( typeof SiMpVC.controllers[name] != 'undefined' ? SiMpVC.controllers[name] : SiMpVC.createController(name) );
		
			// If this is the current loaded controller, then store as the current controller
			if(SiMpVC.currentController == name) SiMpVC.controller = SiMpVC.controllers[name];
								
		});
					
	},

	createModel: function(name, props) {
		
		var defaults = {
			name: name,
			/**
			 * Template vars used in parsing the view
			 */
			vars: {},
			init: function() {
				SiMpVC.models[name].initialized = true;
			}
		};
		
		$.extend(defaults, SiMpVC.modelMethods, props);
		
		return SiMpVC.models[name] = defaults;
	},

	getModel: function(name) {
		
		if(typeof SiMpVC.models[name] != 'undefined') return SiMpVC.model = SiMpVC.models[name];
		
		return $.ajax({
			url: 'models/'+name+'.js',
			dataType: 'script',			
			cache: !SiMpVC.debug
		}).always(function(e) {

			// Cache the loaded controller if its defined, otherwise create a default controller	
			SiMpVC.models[name] = ( typeof SiMpVC.models[name] != 'undefined' ? SiMpVC.models[name] : SiMpVC.createModel(name) );

			// If this is the current loaded controller, then store as the current model
			if(SiMpVC.currentController == name) SiMpVC.model = SiMpVC.models[name];

		});
			
	},	
	
	getView: function(name) {

		if(typeof SiMpVC.views[name] != 'undefined') return SiMpVC.view = SiMpVC.views[name];
		
		// Store the url to request
		var url = name;
		// Rewrite / to _ to allow sub dirs
		name = name.replace('/', '_');
		
		// Get the view
		return $.ajax({
			url: 'views/'+url+'.html',
			cache: !SiMpVC.debug
		}).done(function(data, textStatus, jqXHR) {

			// Prepare the view template
			var ret = SiMpVC.views[name] = SiMpVC.template(data);
			
			// If this is the current controller, then store as the current view
			if(SiMpVC.currentController == name) {
			
				SiMpVC.view = ret;
			
			}
			
		}).fail(function(jqXHR, textStatus, errorThrown) {

			// View was not found
			SiMpVC.log('The ' + name + ' view does not exist', 'Error: undefined view', 'error');
			if(typeof fail == 'function') fail(jqXHR, textStatus, errorThrown);
			
		});
	},
	
	getTemplate: function(opts) {
		
		SiMpVC.log('Rendering ' + opts.name, null, 'start');
			
		// Do we have a rendered view and are we not renewing
		if(opts.rendered && !opts.renew) {

			SiMpVC.log('Using cached rendered view');
			
			// Setup after completed callback
			opts.completed = function() {

				// Setup triggers
				SiMpVC.controllerTrigger();
				
				// Call after display method
				if(typeof opts.afterDisplay == 'function') opts.afterDisplay(opts.rendered);
				
			};

			SiMpVC.log('Done Rendering ' + opts.name, null, 'end');
			
			// Display animation
			SiMpVC.displayViewAnimation(opts);
			
			return;
			
		}

		SiMpVC.whenCompleted(SiMpVC.getView(opts.name), function() {

			SiMpVC.log('Rendering new view');
			
			var view = SiMpVC.views[opts.name];
			var vars = opts.vars ? opts.vars : {};
			
			// Render the template
			opts.rendered = $('<div class="' + opts.name + '-rendered-wrap" />').html(view(vars));
			
			// If controller, store rendered state
			if(opts.isController) SiMpVC.controllers[opts.name].rendered = opts.rendered;
			
			// Call afterRender hook if is controller view
			if(typeof opts.afterRender == 'function') opts.afterRender(opts.rendered);
			
			// Setup after completed callback
			opts.completed = function() {

				// Setup triggers
				SiMpVC.controllerTrigger();
				
				// Call after display method
				if(typeof opts.afterDisplay == 'function') opts.afterDisplay(opts.rendered);
				
			};

			SiMpVC.log('Done Rendering ' + opts.name, null, 'end');
			
			// Display animation
			SiMpVC.displayViewAnimation(opts);
						
		});
		
	},
		
	/**
	 * The animation to use when loading a view
	 *
	 * This method may be rewritten to easily define a custom
	 * animation.
	 *
	 *
	 * @param opts <object>
	 * - view(required) - A rendered view using the SiMpVC.template method
	 *     or using underscores _.template mathod. Since they are the
	 *     same function, either will work fine.
	 *
	 * - loadInto - The target to load the view into. This will default to
	 *     SiMpVC.defaultLoadInto, but any valid jQuery selector will work.
	 *
	 * - complete - A callback function to be called once the animation
	 *     is completed and the view is displayed. The view will be passed
	 *     into the callback as a parameter
	 */
	displayViewAnimation: function(opts) {

		// Append the rendered view
		$(opts.loadInto).fadeOut(function() {
			$(this).empty().append( opts.rendered ).fadeIn(function() {
				// Execute completed callback
				opts.completed();
			});
		});
		
	},
	/**
	 * Sets a value on the current model
	 *
	 * If a model is defined, then the var will be set on the
	 * specified model instead of the current model
	 *
	 * @return <mixed> The value just passed in - Useful for setting values on the fly
	 */
	set: function(name, val, model) {
		if(typeof name == 'undefined') {
			SiMpVC.log('The name of the value being set must be defined', 'undefined "name" param', 'error');
			return;
		}
		if(typeof model == 'undefined') {
			return SiMpVC.model.vars[name] = val;
		} else {
			return SiMpVC.models[model].vars[name] = val;
		}
	},	
	/**
	 * Gets a value from the current model or the specified model
	 *
	 * If name is === null or undefined, the whole var object for the model will be returned
	 */ 
	get: function(name, model) {
		if(name === null || typeof name === 'undefined') {
			var ret = SiMpVC.model.vars;
		} else if(typeof model == 'undefined') {
			var ret = SiMpVC.model.vars[name];
		} else {
			var ret = SiMpVC.models[model].vars[name];
		}
		return typeof ret == 'undefined' ? false : ret;	
	},	
	/**
	 * Execute a callback after all deferred objects have resolved OR rejected
	 *
	 * This fixes the issue with jquerys $.when().then()/always() methods
	 * This will allow you to run the callback completely after all deferred
	 * request objects have been completed. Whether they they fail or succeed.
	 *
	 * jsfiddle showing the issue with jquery default usage - http://jsfiddle.net/zZsxV/
	 * jsfiddle showing the solutions with the custom when method - http://jsfiddle.net/zZsxV/2/
	 *
	 * Thanks to @freakish on http://stackoverflow.com/users/645551/freakish
	 * for his help on this here - http://stackoverflow.com/questions/16780286/jquery-ajax-deferred-callback-orders
	 *
	 */
	whenCompleted: function() {
		// If this is an array then apply array as seperate args to whenCompelted
		if($.isArray(arguments[0])) {
			arguments[0].push(arguments[1]);
			SiMpVC.whenCompleted.apply(SiMpVC.whenCompleted, arguments[0]);
		} else {
			var args = Array.prototype.slice.call(arguments, 0);
			var callback = args.pop();
			var all = [];
			if(typeof callback == 'function') {
				$.each(args, function(index, def) {
					// If def is undefined, then make it a deferred object that resolves
					if(typeof def == 'undefined' || (!def.promise)) def = $.Deferred().resolve();
					def.always(function() {
						var idx = all.indexOf(def);
						if (idx !== -1) {
							all.splice(idx, 1);
						}
						if (!all.length) {
							callback();
						}
					});
					all.push(def);
				});
			}
		}
	},
	
	// By default, Underscore uses ERB-style template delimiters, change the
	// following template settings to use alternative delimiters.
	templateSettings: {
		evaluate    : /<%([\s\S]+?)%>/g,
		interpolate : /<%=([\s\S]+?)%>/g,
		escape      : /<%-([\s\S]+?)%>/g
	},
	// JavaScript micro-templating, similar to John Resig's implementation.
	// Underscore templating handles arbitrary delimiters, preserves whitespace,
	// and correctly escapes quotes within interpolated code.
	template: function(text, data, settings) {
		
		// When customizing `templateSettings`, if you don't want to define an
		// interpolation, evaluation or escaping regex, we need one that is
		// guaranteed not to match.
		var noMatch = /(.)^/;
		
		// Certain characters need to be escaped so that they can be put into a
		// string literal.
		var escapes = {
			"'":      "'",
			'\\':     '\\',
			'\r':     'r',
			'\n':     'n',
			'\t':     't',
			'\u2028': 'u2028',
			'\u2029': 'u2029'
		}
		
		var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

		var render;
		settings = $.extend(true, settings, SiMpVC.templateSettings);
		
		// Combine delimiters into one regular expression via alternation.
		var matcher = new RegExp([
			(settings.escape || noMatch).source,
			(settings.interpolate || noMatch).source,
			(settings.evaluate || noMatch).source
		].join('|') + '|$', 'g');
		
		// Compile the template source, escaping string literals appropriately.
		var index = 0;
		var source = "__p+='";
		text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
			source += text.slice(index, offset)
				.replace(escaper, function(match) { return '\\' + escapes[match]; });
			
			if (escape) {
				source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
			}
			if (interpolate) {
				source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
			}
			if (evaluate) {
				source += "';\n" + evaluate + "\n__p+='";
			}
			index = offset + match.length;
			return match;
		});
		source += "';\n";
		
		// If a variable is not specified, place data values in local scope.
		if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';
		
		source = "var __t,__p='',__j=Array.prototype.join," +
			"print=function(){__p+=__j.call(arguments,'');};\n" +
			source + "return __p;\n";
		
		try {
			render = new Function(settings.variable || 'obj', '_', source);
		} catch (e) {
			e.source = source;
			throw e;
		}
		
		if (data) return render(data, _);
		var template = function(data) {
			return render.call(this, data);
		};
		
		// Provide the compiled function source as a convenience for precompilation.
		template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';
		
		return template;
	},
	
	
};