var request = require('request');


// Initialize what will be used for automatic text measurement.
var Canvas = require('canvas');
var canvasElement = new Canvas(0, 0);   // Width and height are irrelevant.
var canvasContext = canvasElement.getContext('2d');
var CanvasFont = Canvas.Font;
try {
	var opensans = new CanvasFont('Verdana',
		path.join(__dirname, 'Verdana.ttf'));
	canvasContext.addFont(opensans);
} catch (e) {
}
canvasContext.font = '11px Verdana, "DejaVu Sans"';


function EscapeXml(string) {
	return string.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}


function GenerateSVGData(username, repo, textA) {
	request({
			url: 'https://api.travis-ci.org/repos/' + username + '/' + repo,
			headers: {'Accept': 'application/vnd.travis-ci.2+json'}
		},
		function (error, response, body) {
			var buildId = JSON.parse(body).branch.id;

			var sanitizedTextA = EscapeXml(textA);
			var sanitizedTextB = EscapeXml('Passing');

			var widthA = canvasContext.measureText(sanitizedTextA).width + 10;
			var widthB = canvasContext.measureText(sanitizedTextB).width + 10;


			var data = {
				totalWidth: 0,
				widthA: widthA,
				widthB: widthB,
				textA: username,
				textB: repo,
				colorA: '#555',
				colorB: '#4c1'
			}

			data.totalWidth = data.widthA + data.widthB;

			return data;
		});


	return null;
}


module.exports = GenerateSVGData;