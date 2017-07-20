$(document).ready(function () {
	$("#builder").layout_builder({
		debug: 1,
		customControls: {
			global_row: [{callback: 'custom_callback', loc: 'bottom', btnLabel: 'row btn'}],
			global_col: [{callback: 'custom_callback', loc: 'top'}]
		},
	});
});

function custom_callback(container, btnElem) {
	alert('hello world! from custom control');
}
