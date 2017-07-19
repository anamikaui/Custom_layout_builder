(function ($) {

	/**
	 * Main Layout Builder function
	 */
	$.layout_builder = function (el, options) {
		var lb = this;

		lb.$el = $(el);
		lb.el = el;
		lb.$el.data("layout_builder", lb);

		/**
		 * API
		 * @method appendHTMLSelectedCols
		 */
		lb.appendHTMLSelectedCols = function (html) {
			var canvas = lb.$el.find("#" + lb.options.canvasId);
			var cols = canvas.find(lb.options.colSelector);
			$.each(cols, function () {
				if ($(this).hasClass(lb.options.lbEditClassSelected)) {
					$('.' + lb.options.lbEditRegion, this).append(html);
				}
			});
		};
		/**
		 * INIT - Main initialising function to create the canvas, controls and initialise all click handlers

		 */
		lb.init = function () {
			lb.options = $.extend({}, $.layout_builder.defaultOptions, options);
			lb.log("INIT");
			lb.addCSS(lb.options.cssInclude);
			lb.rteControl("init");
			lb.createCanvas();
			lb.createControls();
			lb.initControls();
			lb.initDefaultButtons();
			lb.initCanvas();
			lb.log("FINISHED");
		};
		/*------------------------------------------ Canvas & Controls ---------------------------------------*/


		/**
		 * Build and append the canvas, making sure existing HTML in the user's div is wrapped. Will also trigger Responsive classes to existing markup if specified
		 */
		lb.createCanvas = function () {
			lb.log("+ Create Canvas");
			var html = lb.$el.html();
			lb.$el.html("");
			$('<div/>', {'id': lb.options.canvasId, 'html': html}).appendTo(lb.$el);
			// Add responsive classes after initial loading of HTML, otherwise we lose the rows
			if (lb.options.addResponsiveClasses) {
				lb.addResponsiveness(lb.$el.find("#" + lb.options.canvasId));
			}
			// Add default editable regions: we try and do this early on, as then we don't need to replicate logic to add regions
			if (lb.options.autoEdit) {
				lb.initMarkup(
					lb.$el.find("#" + lb.options.canvasId)
						.find("." + lb.options.colClass)
						.not("." + lb.options.rowClass)
				);
			}
		};

		/**
		 * Looks for and wraps non gm commented markup
		 */
		lb.initMarkup = function (cols) {
			var cTagOpen = '<!--' + lb.options.lbEditRegion + '-->',
				cTagClose = '<!--\/' + lb.options.lbEditRegion + '-->';

			// Loop over each column
			$.each(cols, function (i, col) {
				var hasGmComment = false,
					hasNested = $(col).children().hasClass(lb.options.rowClass);

				// Search for comments within column contents
				// NB, at the moment this is just finding "any" comment for testing, but should search for <!--lb-*
				$.each($(col).contents(), function (x, node) {
					if ($(node)[0].nodeType === 8) {
						hasGmComment = true;
					}
				});

				// Apply default commenting markup
				if (!hasGmComment) {
					if (hasNested) {
						// Apply nested wrap
						$.each($(col).contents(), function (i, val) {
							if ($(val).hasClass(lb.options.rowClass)) {
								var prev = Array.prototype.reverse.call($(val).prevUntil("." + lb.options.rowClass)),
									after = $(val).nextUntil("." + lb.options.rowClass);

								if (!$(prev).hasClass(lb.options.lbEditRegion)) {
									$(prev).first().before(cTagOpen).end()
										.last().after(cTagClose);
								}
								if (!$(after).hasClass(lb.options.lbEditRegion)) {
									$(after).first().before(cTagOpen).end()
										.last().after(cTagClose);
								}
							}
						});

					}
					else {
						// Is there anything to wrap?
						if ($(col).contents().length !== 0) {
							// Apply default comment wrap
							$(col).html(cTagOpen + $(col).html() + cTagClose);
						}
					}
				}
			});
			lb.log("initMarkup ran");
		};

		/*
		 Init global default buttons on cols, rows or both
		 */

		lb.initDefaultButtons = function () {
			if (lb.options.colSelectEnabled) {
				lb.options.customControls.global_col.push({
					callback: lb.selectColClick,
					loc: 'top',
					iconClass: 'fa fa-square-o',
					title: 'Select Column'
				});
			}
			if (lb.options.editableRegionEnabled) {
				lb.options.customControls.global_col.push({
					callback: lb.addEditableAreaClick,
					loc: 'top',
					iconClass: 'fa fa-edit',
					title: 'Add Editable Region'
				});
			}
		};


		/**
		 * Add missing reponsive classes to existing HTML
		 */
		lb.addResponsiveness = function (html) {
			if (html === '') {
				return;
			}
			var desktopRegex = lb.options.colDesktopClass + '(\\d+)',
				tabletRegex = lb.options.colTabletClass + '(\\d+)',
				phoneRegex = lb.options.colPhoneClass + '(\\d+)',
				desktopRegexObj = new RegExp(desktopRegex, 'i'),
				tabletRegexObj = new RegExp(tabletRegex, 'i'),
				phoneRegexObj = new RegExp(phoneRegex, 'i');
			//new_html = '';
			return $(html).find(':regex(class,' + desktopRegex + '|' + tabletRegex + '|' + phoneRegex + ')').each(function (i, el) {
				var elClasses = $(this).attr('class'), colNum = 2;
				var hasDesktop = desktopRegexObj.test(elClasses), hasPhone = phoneRegexObj.test(elClasses),
					hasTablet = tabletRegexObj.test(elClasses);

				colNum = (colNum = desktopRegexObj.exec(elClasses)) ? colNum[1] : ( (colNum = tabletRegexObj.exec(elClasses)) ? colNum[1] : phoneRegexObj.exec(elClasses)[1] );

				if (!hasDesktop) {
					$(this).addClass(lb.options.colDesktopClass + colNum);
				}
				if (!hasPhone) {
					$(this).addClass(lb.options.colPhoneClass + colNum);
				}
				if (!hasTablet) {
					$(this).addClass(lb.options.colTabletClass + colNum);
				}
				// Adds default column classes - probably shouldn't go here, but since we're doing an expensive search to add the responsive classes, it'll do for now.
				if (lb.options.addDefaultColumnClass) {
					if (!$(this).hasClass(lb.options.colClass)) {
						$(this).addClass(lb.options.colClass);
					}
				}
			});
		};

		/**
		 * Build and prepend the control panel
		 */
		lb.createControls = function () {
			lb.log("+ Create Controls");
			var buttons = [];
			// Dynamically generated row template buttons
			$.each(lb.options.controlButtons, function (i, val) {
				var _class = lb.generateButtonClass(val);
				buttons.push("<a title='Add Row " + _class + "' class='" + lb.options.controlButtonClass + " add" + _class + "'><span class='" + lb.options.controlButtonSpanClass + "'></span> " + _class + "</a>");
				lb.generateClickHandler(val);
			});

			/*
			 Generate the control bar markup
			 */
			lb.$el.prepend(
				$('<div/>',
					{'id': lb.options.controlId, 'class': lb.options.lbClearClass}
				).prepend(
					$('<div/>', {"class": lb.options.rowClass}).html(
						$('<div/>', {"class": lb.options.colDesktopClass + lb.options.colMax}).addClass(lb.options.colAdditionalClass).html(
							$('<div/>', {'id': 'lb-addnew'})
								.addClass(lb.options.lbBtnGroup)
								.addClass(lb.options.lbFloatLeft).html(
								buttons.join("")
							)
						).append(lb.options.controlAppend)
					)
				)
			);
		};

		/**
		 * Adds a CSS file or CSS Framework required for specific customizations
		 */
		lb.addCSS = function (myStylesLocation) {
			if (myStylesLocation !== '') {
				$('<link rel="stylesheet" href="' + myStylesLocation + '">').appendTo("head");
			}
		};

		/**
		 * Clean all occurrences of a substring
		 */
		lb.cleanSubstring = function (regex, source, replacement) {
			return source.replace(new RegExp(regex, 'g'), replacement);
		};

		/**
		 * Switches the layout mode for Desktop, Tablets or Mobile Phones
		 */
		lb.switchLayoutMode = function (mode) {
			var canvas = lb.$el.find("#" + lb.options.canvasId), temp_html = canvas.html(), regex1 = '', regex2 = '',
				uimode = '';
			// Reset previous changes
			temp_html = lb.cleanSubstring(lb.options.classRenameSuffix, temp_html, '');
			uimode = $('div.lb-layout-mode > button > span');
			// Do replacements
			switch (mode) {
				case 768:
					regex1 = '(' + lb.options.colDesktopClass + '\\d+)';
					regex2 = '(' + lb.options.colPhoneClass + '\\d+)';
					lb.options.currentClassMode = lb.options.colTabletClass;
					lb.options.colSelector = lb.options.colTabletSelector;
					$(uimode).attr('class', 'fa fa-tablet').attr('title', 'Tablet');
					break;
				case 640:
					regex1 = '(' + lb.options.colDesktopClass + '\\d+)';
					regex2 = '(' + lb.options.colTabletClass + '\\d+)';
					lb.options.currentClassMode = lb.options.colPhoneClass;
					lb.options.colSelector = lb.options.colPhoneSelector;
					$(uimode).attr('class', 'fa fa-mobile-phone').attr('title', 'Phone');
					break;
				default:
					regex1 = '(' + lb.options.colPhoneClass + '\\d+)';
					regex2 = '(' + lb.options.colTabletClass + '\\d+)';
					lb.options.currentClassMode = lb.options.colDesktopClass;
					lb.options.colSelector = lb.options.colDesktopSelector;
					$(uimode).attr('class', 'fa fa-desktop').attr('title', 'Desktop');
			}
			lb.options.layoutDefaultMode = mode;
			temp_html = temp_html.replace(new RegExp((regex1 + '(?=[^"]*">)'), 'gm'), '$1' + lb.options.classRenameSuffix);
			temp_html = temp_html.replace(new RegExp((regex2 + '(?=[^"]*">)'), 'gm'), '$1' + lb.options.classRenameSuffix);
			canvas.html(temp_html);
		};


		/**
		 * Add click functionality to the buttons
		 */
		lb.initControls = function () {
			var canvas = lb.$el.find("#" + lb.options.canvasId);
			lb.log("+ InitControls Running");

			// Turn editing on or off
			lb.$el.on("click", ".lb-preview", function () {
				if (lb.status) {
					lb.deinitCanvas();
					$(this).parent().find(".lb-edit-mode").prop('disabled', true);
				} else {
					lb.initCanvas();
					$(this).parent().find(".lb-edit-mode").prop('disabled', false);
				}
				$(this).toggleClass(lb.options.lbDangerClass);

				// Switch Layout Mode
			}).on("click", ".lb-layout-mode a", function () {
				lb.switchLayoutMode($(this).data('width'));

				// Switch editing mode
			}).on("click", ".lb-edit-mode", function () {
				if (lb.mode === "visual") {
					lb.deinitCanvas();
					canvas.html($('<textarea/>').attr("cols", 130).attr("rows", 25).val(canvas.html()));
					lb.mode = "html";
					$(this).parent().find(".lb-preview, .lb-layout-mode > button").prop('disabled', true);
				} else {
					var editedSource = canvas.find("textarea").val();
					canvas.html(editedSource);
					lb.initCanvas();
					lb.mode = "visual";
					$(this).parent().find(".lb-preview, .lb-layout-mode > button").prop('disabled', false);
				}
				$(this).toggleClass(lb.options.lbDangerClass);

				// Make region editable
			}).on("click", "." + lb.options.lbEditRegion + ' .' + lb.options.lbContentRegion, function () {
				//lb.log("clicked editable");
				if (!$(this).attr("contenteditable")) {
					$(this).attr("contenteditable", false);
					lb.rteControl("attach", $(this));
				}

				// Save Function
			}).on("click", "a.lb-save", function () {
				lb.deinitCanvas();
				lb.saveremote();

				/* Row settings */
			}).on("click", "a.lb-rowSettings", function () {
				var row = $(this).closest(lb.options.rowSelector);
				var drawer = row.find(".lb-rowSettingsDrawer");
				if (drawer.length > 0) {
					drawer.remove();
				} else {
					row.prepend(lb.generateRowSettings(row));
				}

				// Change Row ID via rowsettings
			}).on("blur", "input.lb-rowSettingsID", function () {
				var row = $(this).closest(lb.options.rowSelector);
				row.attr("id", $(this).val());

				// Remove a class from a row via rowsettings
			}).on("click", ".lb-toggleRowClass", function () {
				var row = $(this).closest(lb.options.rowSelector);
				var theClass = $(this).text().trim();
				row.toggleClass(theClass);
				if (row.hasClass(theClass)) {
					$(this).addClass(lb.options.lbDangerClass);
				} else {
					$(this).removeClass(lb.options.lbDangerClass);
				}

				/* Col settings */
			}).on("click", "a.lb-colSettings", function () {
				var col = $(this).closest(lb.options.colSelector);
				var drawer = col.find(".lb-colSettingsDrawer");
				if (drawer.length > 0) {
					drawer.remove();
				} else {
					col.prepend(lb.generateColSettings(col));
				}

				// Change Col ID via colsettings
			}).on("blur", "input.lb-colSettingsID", function () {
				var col = $(this).closest(lb.options.colSelector);
				col.attr("id", $(this).val());

				// Remove a class from a row via rowsettings
			}).on("click", ".lb-togglecolClass", function () {
				var col = $(this).closest(lb.options.colSelector);
				var theClass = $(this).text().trim();
				col.toggleClass(theClass);
				if (col.hasClass(theClass)) {
					$(this).addClass(lb.options.lbDangerClass);
				} else {
					$(this).removeClass(lb.options.lbDangerClass);
				}

				// Add new column to existing row
			}).on("click", "a.lb-addColumn", function () {
				$(this).parent().after(lb.createCol(2));
				lb.switchLayoutMode(lb.options.layoutDefaultMode);
				lb.reset();

				// Add a nested row
			}).on("click", "a.lb-addRow", function () {
				lb.log("Adding nested row");
				$(this).closest("." + lb.options.lbEditClass).append(
					$("<div>").addClass(lb.options.rowClass)
						.html(lb.createCol(6))
						.append(lb.createCol(6)));
				lb.reset();

				// Decrease Column Size
			}).on("click", "a.lb-colDecrease", function () {
				var col = $(this).closest("." + lb.options.lbEditClass);
				var t = lb.getColClass(col);
				if (t.colWidth > parseInt(lb.options.colResizeStep, 10)) {
					t.colWidth = (parseInt(t.colWidth, 10) - parseInt(lb.options.colResizeStep, 10));
					col.switchClass(t.colClass, lb.options.currentClassMode + t.colWidth, 200);
				}

				// Increase Column Size
			}).on("click", "a.lb-colIncrease", function () {
				var col = $(this).closest("." + lb.options.lbEditClass);
				var t = lb.getColClass(col);
				if (t.colWidth < lb.options.colMax) {
					t.colWidth = (parseInt(t.colWidth, 10) + parseInt(lb.options.colResizeStep, 10));
					col.switchClass(t.colClass, lb.options.currentClassMode + t.colWidth, 200);
				}

				// Reset all teh things
			}).on("click", "a.lb-resetgrid", function () {
				canvas.html("");
				lb.reset();

				// Remove a col or row
			}).on("click", "a.lb-removeCol", function () {
				$(this).closest("." + lb.options.lbEditClass).animate({
					opacity: 'hide',
					width: 'hide',
					height: 'hide'
				}, 400, function () {
					$(this).remove();
				});
				lb.log("Column Removed");

			}).on("click", "a.lb-removeRow", function () {
				lb.log($(this).closest("." + lb.options.colSelector));
				$(this).closest("." + lb.options.lbEditClass).animate({opacity: 'hide', height: 'hide'}, 400, function () {
					$(this).remove();
					// Check for multiple editable regions and merge?

				});
				lb.log("Row Removed");

				// For all the above, prevent default.
				// adding maximize and minimize width  size
			}).on("click", "a.lb-resetgrid, a.lb-remove, a.lb-removeRow, a.lb-save, button.lb-preview, a.lb-viewsource, a.lb-addColumn, a.lb-colDecrease, a.lb-colIncrease", function (e) {
				lb.log("Clicked: " + $.grep((this).className.split(" "), function (v) {
						return v.indexOf('lb-') === 0;
					}).join());
				e.preventDefault();
			});

		};

		/**
		 * Add any custom buttons globally on all rows / cols
		 */
		lb.initGlobalCustomControls = function () {
			var canvas = lb.$el.find("#" + lb.options.canvasId),
				elems = [],
				callback = null,
				btnClass = '';

			$.each(['row', 'col'], function (i, control_type) {
				if (typeof lb.options.customControls['global_' + control_type] !== 'undefined') {
					elems = canvas.find(lb.options[control_type + 'Selector']);
					$.each(lb.options.customControls['global_' + control_type], function (i, curr_control) {
						// controls with no valid callbacks set are skipped
						if (typeof curr_control.callback === 'undefined') {
							return;
						}

						if (typeof curr_control.loc === 'undefined') {
							curr_control.loc = 'top';
						}
						if (typeof curr_control.iconClass === 'undefined') {
							curr_control.iconClass = 'fa fa-file-code-o';
						}
						if (typeof curr_control.btnLabel === 'undefined') {
							curr_control.btnLabel = '';
						}
						if (typeof curr_control.title === 'undefined') {
							curr_control.title = '';
						}

						btnClass = (typeof curr_control.callback === 'function') ? (i + '_btn') : (curr_control.callback);

						btnObj = {
							element: 'a',
							btnClass: 'lb-' + btnClass,
							iconClass: curr_control.iconClass,
							btnLabel: curr_control.btnLabel,
							title: curr_control.title
						};

						$.each(elems, function (i, current_elem) {
							lb.setupCustomBtn(current_elem, curr_control.loc, 'window', curr_control.callback, btnObj);
						});
					});
				}
			});
		};

		/**
		 * Add any custom buttons configured on the data attributes
		 */
		lb.initCustomControls = function () {
			var canvas = lb.$el.find("#" + lb.options.canvasId),
				callbackParams = '',
				callbackScp = '',
				callbackFunc = '',
				btnLoc = '',
				btnObj = {},
				iconClass = '',
				btnLabel = '';

			$(('.' + lb.options.colClass + ':data,' + ' .' + lb.options.rowClass + ':data'), canvas).each(function () {
				for (prop in $(this).data()) {
					if (prop.indexOf('lbButton') === 0) {
						callbackFunc = prop.replace('lbButton', '');
						callbackParams = $(this).data()[prop].split('|');
						// Cannot accept 0 params or empty callback function name
						if (callbackParams.length === 0 || callbackFunc === '') {
							break;
						}

						btnLoc = (typeof callbackParams[3] !== 'undefined') ? callbackParams[3] : 'top';
						iconClass = (typeof callbackParams[2] !== 'undefined') ? callbackParams[2] : 'fa fa-file-code-o';
						btnLabel = (typeof callbackParams[1] !== 'undefined') ? callbackParams[1] : '';
						callbackScp = callbackParams[0];
						btnObj = {
							element: 'a',
							btnClass: ('lb-' + callbackFunc),
							iconClass: iconClass,
							btnLabel: btnLabel
						};
						lb.setupCustomBtn(this, btnLoc, callbackScp, callbackFunc, btnObj);
						break;
					}
				}
			});
		};


		/**
		 * Configures custom button click callback function
		 */
		lb.setupCustomBtn = function (container, btnLoc, callbackScp, callbackFunc, btnObj) {
			var callback = null;

			// Ensure we have a valid callback, if not skip
			if (typeof callbackFunc === 'string') {
				callback = lb.isValidCallback(callbackScp, callbackFunc.toLowerCase());
			} else if (typeof callbackFunc === 'function') {
				callback = callbackFunc;
			} else {
				return false;
			}
			// Set default button location to the top toolbar
			btnLoc = (btnLoc === 'bottom') ? ':last' : ':first';

			// Add the button to the selected toolbar
			$(('.' + lb.options.lbToolClass + btnLoc), container).append(lb.buttonFactory([btnObj])).find(':last').on('click', function (e) {
				callback(container, this);
				e.preventDefault();
			});
			return true;
		};

		/*
		 Clears any comments inside a given element

		 @elem - element to clear html comments on

		 returns void
		 */

		lb.clearComments = function (elem) {
			$(elem, '#' + lb.options.canvasId).contents().filter(function () {
				return this.nodeType === 8;
			}).remove();
		};

		/**
		 * Checks that a callback exists and returns it if available
		 */
		lb.isValidCallback = function (callbackScp, callbackFunc) {
			var callback = null;

			if (callbackScp === 'window') {
				if (typeof window[callbackFunc] === 'function') {
					callback = window[callbackFunc];
				} else { // If the global function is not valid there is nothing to do
					return false;
				}
			} else if (typeof window[callbackScp][callbackFunc] === 'function') {
				callback = window[callbackScp][callbackFunc];
			} else { // If there is no valid callback there is nothing to do
				return false;
			}
			return callback;
		};

		/**
		 * Get the col-md-6 class, returning 6 as well from column
		 */
		lb.getColClass = function (col) {
			var colClass = $.grep(col.attr("class").split(" "), function (v) {
				return v.indexOf(lb.options.currentClassMode) === 0;
			}).join();
			var colWidth = colClass.replace(lb.options.currentClassMode, "");
			return {colClass: colClass, colWidth: colWidth};
		};

		/*
		 *Run (if set) any custom init/deinit filters on the layout_builder canvas
		 */

		lb.runFilter = function (canvasElem, isInit) {
			if (typeof lb.options.filterCallback === 'function') {
				lb.options.filterCallback(canvasElem, isInit);
			}
			if (lb.options.editableRegionEnabled) {
				lb.editableAreaFilter(canvasElem, isInit);
			}
		};

		/**
		 * Turns canvas into lb-editing mode - does most of the hard work here
		 */
		lb.initCanvas = function () {
			var canvas = lb.$el.find("#" + lb.options.canvasId);
			lb.switchLayoutMode(lb.options.layoutDefaultMode);
			var cols = canvas.find(lb.options.colSelector);
			var rows = canvas.find(lb.options.rowSelector);
			// Show the template controls
			lb.$el.find("#lb-addnew").show();
			// Sort Rows First
			lb.activateRows(rows);
			// Now Columns
			lb.activateCols(cols);
			// Run custom init callback filter
			lb.runFilter(canvas, true);
			// Get cols & rows again after filter execution
			cols = canvas.find(lb.options.colSelector);
			rows = canvas.find(lb.options.rowSelector);
			// Make Rows sortable
			canvas.sortable({
				items: rows,
				axis: 'y',
				placeholder: lb.options.rowSortingClass,
				handle: ".lb-moveRow",
				forcePlaceholderSize: true, opacity: 0.7, revert: true,
				tolerance: "pointer",
				cursor: "move"
			});
			/*
			 Make columns sortable
			 This needs to be applied to each element, otherwise containment leaks
			 */
			$.each(rows, function (i, val) {
				$(val).sortable({
					items: $(val).find(lb.options.colSelector),
					axis: 'x',
					handle: ".lb-moveCol",
					forcePlaceholderSize: true, opacity: 0.7, revert: true,
					tolerance: "pointer",
					containment: $(val),
					cursor: "move"
				});
			});

			lb.status = true;
			lb.mode = "visual";
			lb.initCustomControls();
			lb.initGlobalCustomControls();
			lb.initNewContentElem();
		};

		/**
		 * Removes canvas editing mode
		 */
		lb.deinitCanvas = function () {
			// cache canvas
			var canvas = lb.$el.find("#" + lb.options.canvasId);
			var cols = canvas.find(lb.options.colSelector);
			var rows = canvas.find(lb.options.rowSelector);

			lb.log("- deInitCanvas Running");
			// Hide template control
			lb.$el.find("#lb-addnew").hide();
			// Sort Rows First
			lb.deactivateRows(rows);
			// Now Columns
			lb.deactivateCols(cols);
			// Clean markup
			lb.cleanup();
			lb.runFilter(canvas, false);
			lb.status = false;
		};

		/**
		 * Push cleaned div content somewhere to save it
		 */
		lb.saveremote = function () {
			var canvas = lb.$el.find("#" + lb.options.canvasId);
			$.ajax({
				type: "POST",
				url: lb.options.remoteURL,
				data: {content: canvas.html()}
			});
		};


		/*------------------------------------------ ROWS ---------------------------------------*/
		/**
		 * Look for pre-existing rows and add editing tools as appropriate
		 */
		lb.activateRows = function (rows) {
			lb.log("++ Activate Rows");
			rows.addClass(lb.options.lbEditClass)
				.prepend(lb.toolFactory(lb.options.rowButtonsPrepend))
				.append(lb.toolFactory(lb.options.rowButtonsAppend));
		};

		/**
		 * Look for pre-existing rows and remove editing classes as appropriate
		 */
		lb.deactivateRows = function (rows) {
			lb.log("-- DeActivate Rows");
			rows.removeClass(lb.options.lbEditClass)
				.removeClass("ui-sortable")
				.removeAttr("style");
		};

		/**
		 * Create a single row with appropriate editing tools & nested columns
		 */
		lb.createRow = function (colWidths) {
			var row = $("<div/>", {"class": lb.options.rowClass + " " + lb.options.lbEditClass});
			$.each(colWidths, function (i, val) {
				row.append(lb.createCol(val));
			});
			lb.log("++ Created Row");
			return row;
		};

		/**
		 * Create the row specific settings box
		 */
		lb.generateRowSettings = function (row) {
			// Row class toggle buttons
			var classBtns = [];
			$.each(lb.options.rowCustomClasses, function (i, val) {
				var btn = $("<button/>")
					.addClass("lb-toggleRowClass")
					.addClass(lb.options.controlButtonClass)
					.append(
						$("<span/>")
							.addClass(lb.options.controlButtonSpanClass)
					).append(" " + val);

				if (row.hasClass(val)) {
					btn.addClass(lb.options.lbDangerClass);
				}
				classBtns.push(btn[0].outerHTML);
			});
			// Row settings drawer
			var html = $("<div/>")
				.addClass("lb-rowSettingsDrawer")
				.addClass(lb.options.lbToolClass)
				.addClass(lb.options.lbClearClass)
				.prepend($("<div />")
					.addClass(lb.options.lbBtnGroup)
					.addClass(lb.options.lbFloatLeft)
					.html(classBtns.join("")))
				.append($("<div />").addClass("pull-right").html(
					$("<label />").html("Row ID ").append(
						$("<input>").addClass("lb-rowSettingsID").attr({type: 'text', placeholder: 'Row ID', value: row.attr("id")})
					)
				));

			return html[0].outerHTML;
		};

		/**
		 * Create the col specific settings box
		 */
		lb.generateColSettings = function (col) {
			// Col class toggle buttons
			var classBtns = [];
			$.each(lb.options.colCustomClasses, function (i, val) {
				var btn = $("<button/>")
					.addClass("lb-togglecolClass")
					.addClass(lb.options.controlButtonClass)
					.append(
						$("<span/>")
							.addClass(lb.options.controlButtonSpanClass)
					).append(" " + val);
				if (col.hasClass(val)) {
					btn.addClass(lb.options.lbDangerClass);
				}
				classBtns.push(btn[0].outerHTML);
			});
			// col settings drawer
			var html = $("<div/>")
				.addClass("lb-colSettingsDrawer")
				.addClass(lb.options.lbToolClass)
				.addClass(lb.options.lbClearClass)
				.prepend($("<div />")
					.addClass(lb.options.lbBtnGroup)
					.addClass(lb.options.lbFloatLeft)
					.html(classBtns.join("")))
				.append($("<div />").addClass("pull-right").html(
					$("<label />").html("col ID ").append(
						$("<input>")
							.addClass("lb-colSettingsID")
							.attr({type: 'text', placeholder: 'col ID', value: col.attr("id")})
					)
				));

			return html[0].outerHTML;
		};

		/*------------------------------------------ COLS ---------------------------------------*/

		/**
		 * Look for pre-existing columns and add editing tools as appropriate
		 */
		lb.activateCols = function (cols) {
			cols.addClass(lb.options.lbEditClass);
			// For each column,
			$.each(cols, function (i, column) {
				$(column).prepend(lb.toolFactory(lb.options.colButtonsPrepend));
				$(column).append(lb.toolFactory(lb.options.colButtonsAppend));
			});
			lb.log("++ Activate Cols Ran");
		};

		/**
		 * Look for pre-existing columns and removeediting tools as appropriate
		 */
		lb.deactivateCols = function (cols) {
			cols.removeClass(lb.options.lbEditClass)
				.removeClass(lb.options.lbEditClassSelected)
				.removeClass("ui-sortable");
			$.each(cols.children(), function (i, val) {
				// Grab contents of editable regions and unwrap
				if ($(val).hasClass(lb.options.lbEditRegion)) {
					if ($(val).html() !== '') {
						$(val).contents().unwrap();
					} else {
						// Deals with empty editable regions
						$(val).remove();
					}
				}
			});
		};

		/**
		 * Create a single column with appropriate editing tools
		 */
		lb.createCol = function (size) {
			var col = $("<div/>")
				.addClass(lb.options.colClass)
				.addClass(lb.options.colDesktopClass + size)
				.addClass(lb.options.colTabletClass + size)
				.addClass(lb.options.colPhoneClass + size)
				.addClass(lb.options.lbEditClass)
				.addClass(lb.options.colAdditionalClass)
				.html(lb.toolFactory(lb.options.colButtonsPrepend))
				.prepend(lb.toolFactory(lb.options.colButtonsPrepend))
				.append(lb.toolFactory(lb.options.colButtonsAppend));
			return col;
		};


		/*------------------------------------------ Editable Regions ---------------------------------------*/

		/*
		 Callback called when a the new editable area button is clicked
		 */
		lb.addEditableAreaClick = function (container, btn) {
			var cTagOpen = '<!--' + lb.options.lbEditRegion + '-->',
				cTagClose = '<!--\/' + lb.options.lbEditRegion + '-->',
				elem = null;
			$(('.' + lb.options.lbToolClass + ':last'), container)
				.before(elem = $('<div>').addClass(lb.options.lbEditRegion + ' ' + lb.options.contentDraggableClass)
					.append(lb.options.controlContentElem + '<div class="' + lb.options.lbContentRegion + '"><p>Enter Text Content</p></div>')).before(cTagClose).prev().before(cTagOpen);
			lb.initNewContentElem(elem);
		};

		/*
		 Prepares any new content element inside columns so inner toolbars buttons work
		 and any drag & drop functionality.
		 */

		lb.initNewContentElem = function (newElem) {
			var parentCols = null;

			if (typeof newElem === 'undefined') {
				parentCols = lb.$el.find('.' + lb.options.colClass);
			} else {
				parentCols = newElem.closest('.' + lb.options.colClass);
			}

			$.each(parentCols, function (i, col) {
				$(col).on('click', '.lb-delete', function (e) {
					$(this).closest('.' + lb.options.lbEditRegion).remove();
					lb.resetCommentTags(col);
					e.preventDefault();
				});
				$(col).sortable({
					items: '.' + lb.options.contentDraggableClass,
					axis: 'y',
					placeholder: lb.options.rowSortingClass,
					handle: "." + lb.options.controlMove,
					forcePlaceholderSize: true, opacity: 0.7, revert: true,
					tolerance: "pointer",
					cursor: "move",
					stop: function (e, ui) {
						lb.resetCommentTags($(ui.item).parent());
					}
				});
			});

		};

		/*
		 Resets the comment tags for editable elements
		 */
		lb.resetCommentTags = function (elem) {
			var cTagOpen = '<!--' + lb.options.lbEditRegion + '-->',
				cTagClose = '<!--\/' + lb.options.lbEditRegion + '-->';
			// First remove all existing comments
			lb.clearComments(elem);
			// Now replace these comment tags
			$('.' + lb.options.lbEditRegion, elem).before(cTagOpen).after(cTagClose);
		};

		/*
		 Filter method to restore editable regions in edit mode.
		 */
		lb.editableAreaFilter = function (canvasElem, isInit) {
			if (isInit) {
				var cTagOpen = '<!--' + lb.options.lbEditRegion + '-->',
					cTagClose = '<!--\/' + lb.options.lbEditRegion + '-->',
					regex = new RegExp('(?:' + cTagOpen + ')\\s*([\\s\\S]+?)\\s*(?:' + cTagClose + ')', 'g'),
					html = $(canvasElem).html(),
					rep = cTagOpen + '<div class="' + lb.options.lbEditRegion + ' ' + lb.options.contentDraggableClass + '">' + lb.options.controlContentElem + '<div class="' + lb.options.lbContentRegion + '">$1</div></div>' + cTagClose;

				html = html.replace(regex, rep);
				$(canvasElem).html(html);
				lb.log("editableAreaFilter init ran");
			} else {
				$('.' + lb.options.controlNestedEditable, canvasElem).remove();
				$('.' + lb.options.lbContentRegion).contents().unwrap();

				lb.log("editableAreaFilter deinit ran");
			}
		};

		/*------------------------------------------ BTNs ---------------------------------------*/
		/**
		 * Returns an editing div with appropriate btns as passed in
		 */
		lb.toolFactory = function (btns) {
			var tools = $("<div/>")
				.addClass(lb.options.lbToolClass)
				.addClass(lb.options.lbClearClass)
				.html(lb.buttonFactory(btns));
			return tools[0].outerHTML;
		};

		/**
		 * Returns html string of buttons
		 */
		lb.buttonFactory = function (btns) {
			var buttons = [];
			$.each(btns, function (i, val) {
				val.btnLabel = (typeof val.btnLabel === 'undefined') ? '' : val.btnLabel;
				val.title = (typeof val.title === 'undefined') ? '' : val.title;
				buttons.push("<" + val.element + " title='" + val.title + "' class='" + val.btnClass + "'><span class='" + val.iconClass + "'></span>&nbsp;" + val.btnLabel + "</" + val.element + "> ");
			});
			return buttons.join("");
		};

		/**
		 *  Create button for choosing layout like [12,[6,6]]
		 *   and create classes and id
		 */
		lb.generateButtonClass = function (arr) {
			var string = "";
			$.each(arr, function (i, val) {
				string = string + "-" + val;
			});
			return string;
		};

		/**
		 *  Click Add one complete grid layout markup as per no of coloumn [12,[6,6]] layout
		 * @param colWidths
		 */
		lb.generateClickHandler = function (colWidths) {
			var string = "a.add" + lb.generateButtonClass(colWidths);
			var canvas = lb.$el.find("#" + lb.options.canvasId);
			lb.$el.on("click", string, function (e) {
				lb.log("Clicked " + string);
				canvas.prepend(lb.createRow(colWidths));
				lb.reset();
				e.preventDefault();
			});
		};


		/*------------------------------------------ RTEs ---------------------------------------*/
		/**
		 * Starts, stops, looks for and  attaches RTEs
		 */
		lb.rteControl = function (action, element) {
			lb.log("RTE " + lb.options.rte + ' ' + action);
			switch (action) {
				case 'attach':
					switch (lb.options.rte) {
						case 'tinymce':
							if (!(element).hasClass("mce-content-body")) {
								element.tinymce(lb.options.tinymce.config);
							}
							break;
						default:
					}
					break; //end Attach
				case 'stop':
					switch (lb.options.rte) {
						case 'tinymce':
							// destroy TinyMCE
							window.tinymce.remove();
							break;
						default:
					}
					break; //end stop
				default:
					lb.log("No RTE Action specified");
			}
		};


		/*------------------------------------------ Useful functions ---------------------------------------*/

		/**
		 * Quick reset - deinit & init the canvas
		 */
		lb.reset = function () {

			lb.deinitCanvas();
			lb.initCanvas();
		};

		/**
		 * Remove all extraneous markup
		 */
		lb.cleanup = function () {

			var canvas,
				content;

			// cache canvas
			canvas = lb.$el.find("#" + lb.options.canvasId);

			/**
			 * Determine the current edit mode and get the content based upon the resultant
			 */
			content = lb.mode !== "visual" ? canvas.find('textarea').val() : canvas.html();

			// Clean any temp class strings
			canvas.html(lb.cleanSubstring(lb.options.classRenameSuffix, content, ''));

			// Clean column markup
			canvas.find(lb.options.colSelector)
				.removeAttr("style")
				.removeAttr("spellcheck")
				.removeClass("mce-content-body").end()
			// Clean img markup
				.find("img")
				.removeAttr("style")
				.addClass("img-responsive")
				.removeAttr("data-cke-saved-src")
				.removeAttr("data-mce-src").end()
			// Remove Tools
				.find("." + lb.options.lbToolClass).remove();
			// Destroy any RTEs
			lb.rteControl("stop");
			lb.log("~~Cleanup Ran~~");
		};

		/**
		 * Generic logging function
		 */
		lb.log = function (logvar) {
			if (lb.options.debug) {
				if ((window['console'] !== undefined)) {
					window.console.log(logvar);
				}
			}
		};

		// Run initializer
		lb.init();
	};


	/**
	 Options which can be overridden by the .layout_builder() call on the requesting page------------------------------------------------------
	 */
	$.layout_builder.defaultOptions = {
		debug: 0,

		// Are you columns selectable
		colSelectEnabled: true,

		// Can add editable regions?
		editableRegionEnabled: true,

		// Should we try and automatically create editable regions?
		autoEdit: true,

		// URL to save to
		remoteURL: "/replace-with-your-url",

		// Custom CSS to load
		cssInclude: "//maxcdn.bootstrapcdn.com/font-awesome/4.1.0/css/font-awesome.min.css",

		// Filter callback. Callback receives two params: the template grid element and whether is called from the init or deinit method
		filterCallback: null,
		/*
		 Canvas---------------
		 */
		// Canvas ID
		canvasId: "lb-canvas",

		/*
		 Control Bar---------------
		 */
		// Top Control Row ID
		controlId: "lb-controls",

		// Move handle class
		controlMove: 'lb-move',

		// Editable element toolbar class
		controlNestedEditable: 'lb-controls-element',

		// Array of buttons for row templates
		controlButtons: [[12], [6, 6]],

		// Custom Global Controls for rows & cols - available props: global_row, global_col
		customControls: {global_row: [], global_col: []},

		// Default control button class
		controlButtonClass: "btn  btn-xs  btn-primary",

		// Default control button icon
		controlButtonSpanClass: "fa fa-plus-circle",

		// Control bar RH dropdown markup
		controlAppend: "<div class='btn-group pull-right'><button title='Edit Source Code' type='button' class='btn btn-xs btn-primary lb-edit-mode'><span class='fa fa-code'></span></button><button title='Preview' type='button' class='btn btn-xs btn-primary lb-preview'><span class='fa fa-eye'></span></button>     <div class='dropdown pull-left lb-layout-mode'><button type='button' class='btn btn-xs btn-primary dropdown-toggle' data-toggle='dropdown'><span class='caret'></span></button> <ul class='dropdown-menu' role='menu'><li><a data-width='auto' title='Desktop'><span class='fa fa-desktop'></span> Desktop</a></li><li><a title='Tablet' data-width='768'><span class='fa fa-tablet'></span> Tablet</a></li><li><a title='Phone' data-width='640'><span class='fa fa-mobile-phone'></span> Phone</a></li></ul></div>    <button type='button' class='btn  btn-xs  btn-primary dropdown-toggle' data-toggle='dropdown'><span class='caret'></span><span class='sr-only'>Toggle Dropdown</span></button><ul class='dropdown-menu' role='menu'><li><a title='Save'  href='#' class='lb-save'><span class='fa fa-save'></span> Save</a></li><li><a title='Reset Grid' href='#' class='lb-resetgrid'><span class='fa fa-trash-o'></span> Reset</a></li></ul></div>",

		// Controls for content elements
		controlContentElem: '<div class="lb-controls-element"> <a class="lb-move fa fa-arrows" href="#" title="Move"></a> <a class="lb-delete fa fa-times" href="#" title="Delete"></a> </div>',
		/*
		 General editing classes---------------
		 */
		// Standard edit class, applied to active elements
		lbEditClass: "lb-editing",

		// Applied to the currently selected element
		lbEditClassSelected: "lb-editing-selected",

		// Editable region class
		lbEditRegion: "lb-editable-region",

		// Editable container class
		lbContentRegion: "lb-content",

		// Tool bar class which are inserted dynamically
		lbToolClass: "lb-tools",

		// Clearing class, used on most toolbars
		lbClearClass: "clearfix",

		// generic float left and right
		lbFloatLeft: "pull-left",
		lbFloatRight: "pull-right",
		lbBtnGroup: "btn-group",
		lbDangerClass: "btn-danger",


		/*
		 Rows---------------
		 */
		// Generic row class. change to row--fluid for fluid width in Bootstrap
		rowClass: "row",

		// Used to find rows - change to div.row-fluid for fluid width
		rowSelector: "div.row",

		// class of background element when sorting rows
		rowSortingClass: "alert-warning",

		// Buttons at the top of each row
		rowButtonsPrepend: [
			{
				title: "Move",
				element: "a",
				btnClass: "lb-moveRow pull-left",
				iconClass: "fa fa-arrows "
			},
			{
				title: "New Column",
				element: "a",
				btnClass: "lb-addColumn pull-left  ",
				iconClass: "fa fa-plus"
			},
			{
				title: "Row Settings",
				element: "a",
				btnClass: "pull-right lb-rowSettings",
				iconClass: "fa fa-cog"
			}

		],

		// Buttons at the bottom of each row
		rowButtonsAppend: [
			{
				title: "Remove row",
				element: "a",
				btnClass: "pull-right lb-removeRow",
				iconClass: "fa fa-trash-o"
			}
		],


		// CUstom row classes - add your own to make them available in the row settings
		rowCustomClasses: ["example-class", "test-class"],

		/*
		 Columns--------------
		 */
		// Column Class
		colClass: "column",

		// Class to allow content to be draggable
		contentDraggableClass: 'lb-content-draggable',

		// Adds any missing classes in columns for muti-device support.
		addResponsiveClasses: true,

		// Adds "colClass" to columns if missing: addResponsiveClasses must be true for this to activate
		addDefaultColumnClass: true,

		// Generic desktop size layout class
		colDesktopClass: "col-md-",

		// Generic tablet size layout class
		colTabletClass: "col-sm-",

		// Generic phone size layout class
		colPhoneClass: "col-xs-",

		// Wild card column desktop selector
		colDesktopSelector: "div[class*=col-md-]",

		// Wildcard column tablet selector
		colTabletSelector: "div[class*=col-sm-]",

		// Wildcard column phone selector
		colPhoneSelector: "div[class*=col-xs-]",

		// String used to temporarily rename column classes not in use
		classRenameSuffix: "-clsstmp",

		// Default layout mode loaded after init
		layoutDefaultMode: "auto",

		// Current layout column mode
		currentClassMode: "",

		// Additional column class to add (foundation needs columns, bs3 doesn't)
		colAdditionalClass: "",

		// Buttons to prepend to each column
		colButtonsPrepend: [
			{
				title: "Move",
				element: "a",
				btnClass: "lb-moveCol pull-left",
				iconClass: "fa fa-arrows "
			},
			{
				title: "Column Settings",
				element: "a",
				btnClass: "pull-right lb-colSettings",
				iconClass: "fa fa-cog"
			},
			{
				title: "Make Column Narrower",
				element: "a",
				btnClass: "lb-colDecrease pull-left",
				iconClass: "fa fa-minus"
			},
			{
				title: "Make Column Wider",
				element: "a",
				btnClass: "lb-colIncrease pull-left",
				iconClass: "fa fa-plus"
			}
		],

		// Buttons to append to each column
		colButtonsAppend: [
			{
				title: "Add Nested Row",
				element: "a",
				btnClass: "pull-left lb-addRow",
				iconClass: "fa fa-plus-square"
			},
			{
				title: "Remove Column",
				element: "a",
				btnClass: "pull-right lb-removeCol",
				iconClass: "fa fa-trash-o"
			}
		],

		// CUstom col classes - add your own to make them available in the col settings
		colCustomClasses: ["auto-generate-col-class", "auto-added-class"],

		// Maximum column span value: if you've got a 24 column grid via customised bootstrap, you could set this to 24.
		colMax: 12,

		// Column resizing +- value: this is also the colMin value, as columns won't be able to go smaller than this number (otherwise you hit zero and all hell breaks loose)
		colResizeStep: 1,

		/*
		 Rich Text Editors
		 */
		tinymce: {
			config: {
				inline: true,
				plugins: [
					"advlist autolink lists link image charmap print preview anchor",
					"searchreplace visualblocks code fullscreen",
					"insertdatetime media table contextmenu paste"
				],
				toolbar: "insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image"
			}
		},

	};

	/**
	 * Exposes layout_builder as jquery function
	 */
	$.fn.layout_builder = function (options) {
		return this.each(function () {
			var element = $(this);
			var layout_builder = new $.layout_builder(this, options);
			element.data('layout_builder', layout_builder);
		});
	};

	/**
	 * General Utility Regex function used to get custom callback attributes
	 */
	$.expr[':'].regex = function (elem, index, match) {

		var matchParams = match[3].split(','),
			validLabels = /^(data|css):/,
			attr = {
				method: matchParams[0].match(validLabels) ?
					matchParams[0].split(':')[0] : 'attr',
				property: matchParams.shift().replace(validLabels, '')
			},
			regexFlags = 'ig',
			regex = new RegExp(matchParams.join('').replace(/^\s+|\s+$/g, ''), regexFlags);
		return regex.test(jQuery(elem)[attr.method](attr.property));
	};
})(jQuery);