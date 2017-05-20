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

	res.render('shield_template.svg.pug', data);
}

function GenerateSVGImage(res, username, repo, label, os, compiler, branch) {
	if (!label) {
		label = 'build';
	}

	// Look up the repo
	// Default to the master branch if not specified
	var options = {
		url: 'https://api.travis-ci.org/repos/'+ username + '/' + repo + '/branches/' + (branch ? branch : 'master'),
        headers: {'Accept': 'application/vnd.travis-ci.2+json'}
	};

	request(options, function (error, response, body) {
		if (error || response.statusCode != 200) {
			CreateSVG(res, label, 'repo not found');
			return;
		}

		var jsonBody = JSON.parse(body);

		// If they don't specify an os / compiler combo, just return the status of the whole build
		if (!os && !compiler) {
			CreateSVG(res, label, jsonBody.branch.state.replace(/ed$/, "ing"));
			return;
		}

		var buildId = jsonBody.branch.id;
		if(!buildId){
			CreateSVG(res, label, 'repo not found');
			return;
		}

		// Look up the build
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

			// Try to find the os / compiler combo specified
			for (var i = 0; i < jobs.length; i++) {
				// If they don't specify an OS, dont' check for it
				var osCorrect = os ? false : true;
				if (os && jobs[i].config.os == os) {
					osCorrect = true;
				}

				// If they don't specify a compiler, don't check for it
				var compilerCorrect = compiler ? false : true;
				if (compiler) {
					// Travis CI API only gives the basic compiler (IE. gcc / clang)
					// It doesn't give the detailed version
					// For that, we rely on the environment variables passed in
                    var myRegexp = /MY_CC=(.*?) /g;
                    var match = myRegexp.exec(jobs[i].config.env);
                    if (match !== null) {
                        if (match[1] == compiler) {
                            compilerCorrect = true;
                        }
                    }
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


			var status = jobs[jobIndex].state;
			CreateSVG(res, label, status.replace(/ed$/, "ing"));
		});
	});
}



module.exports = GenerateSVGImage;