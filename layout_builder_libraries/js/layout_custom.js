$(document).ready(function () {
	$("#builder").gridmanager({
		debug: 1,
		customControls: {
			global_row: [{callback: 'custom_callback', loc: 'bottom', btnLabel: 'row btn'}],
			global_col: [{callback: 'custom_callback', loc: 'top'}]
		},
		filterCallback: filter
	});
});

function custom_callback(container, btnElem) {
	alert('hello world! from custom control');
}

function filter(templateGrid, isInit) {
	if (isInit) {
		// when in edit mode (init) this section will run
		templateGrid.find('.row').each(function (i, el) {
			$(el).addClass('my-class');
		});
	} else {
		// when viewing the source or in preview mode (deinit) this section will run
		templateGrid.find('.my-class').each(function (i, el) {
			$(el).removeClass('my-class');
		});
	}
}