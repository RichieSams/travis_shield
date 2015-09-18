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

function CreateSVG(res, label, buildStatus) {
	var sanitizedTextA = EscapeXml(label);
	var sanitizedTextB = EscapeXml(buildStatus);

	var widthA = canvasContext.measureText(sanitizedTextA).width + 10;
	var widthB = canvasContext.measureText(sanitizedTextB).width + 10;

	var colors = {
		'passing': '#4c1',
		'failing': '#e05d44',
		'error': '#9f9f9f'
	};

	var data = {
		totalWidth: 0,
		widthA: widthA,
		widthB: widthB,
		textA: sanitizedTextA,
		textB: sanitizedTextB,
		colorA: '#555',
		colorB: colors[sanitizedTextB] || colors['error']
	};

	data.totalWidth = data.widthA + data.widthB;

	res.contentType('image/svg+xml');
	res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
	
	var reqTime = new Date();
	var date = (reqTime).toGMTString();
	res.setHeader('Expires', date);  // Proxies, GitHub, see #221.
	res.setHeader('Date', date);

	res.render('shield_template.svg.jade', data);
}

function GenerateSVGImage(res, username, repo, label, os, compiler) {
	if (!label) {
		label = 'Build';
	}

	var options = {
		url: "https://api.travis-ci.org/repos/" + username + "/" + repo,
		headers: {'Accept': 'application/vnd.travis-ci.2+json'}
	};

	request(options, function (error, response, body) {
		if (error || response.statusCode != 200) {
			CreateSVG(res, label, 'repo not found');
			return;
		}

		var buildId = JSON.parse(body).repo.last_build_id;
		if(!buildId){
			CreateSVG(res, label, 'repo not found');
			return;
		}

		var options2 = {
			url: "https://api.travis-ci.org/builds/" + buildId,
			headers: {'Accept': 'application/vnd.travis-ci.2+json'}
		};

		request(options2, function (error2, response2, body2) {
			if (error2 || response2.statusCode != 200) {
				CreateSVG(res, label, 'build not found');
				return;
			}

			var jobs = JSON.parse(body2).jobs;
			if (!jobs) {
				CreateSVG(res, label, 'build not found');
				return;
			}

			var jobIndex = -1;
			if (os || compiler) {
				for (var i = 0; i < jobs.length; i++) {
					var osCorrect = true;
					if (os && jobs[i].config.os != os) {
						osCorrect = false;
					}

					var compilerCorrect = true;
					if (compiler && jobs[i].config.compiler != compiler) {
						compilerCorrect = false;
					}

					if (osCorrect && compilerCorrect) {
						jobIndex = i;
						break;
					}
				}

				if (jobIndex == -1) {
					CreateSVG(res, label, 'os/compiler build not found');
					return;
				}
			} else {
				jobIndex = 0;
			}

			var status = jobs[jobIndex].state;
			CreateSVG(res, label, status.replace(/ed$/, "ing"));
		});
	});
}



module.exports = GenerateSVGImage;