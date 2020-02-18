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

function isEmptyObject(obj) {
	return !Object.keys(obj).length;
}

function GenerateTravisSVGImage(res, username, repo, queries) {
	label = 'build'
	if (queries.label) {
		label = queries.label
		delete queries.label
	}

	branch = 'master'
	if (queries.branch) {
		branch = queries.branch
		delete queries.branch
	}

	// Look up the repo
	// Default to the master branch if not specified
	var options = {
		url: 'https://api.travis-ci.org/repos/'+ username + '/' + repo + '/branches/' + branch,
        headers: {'Accept': 'application/vnd.travis-ci.2+json'}
	};

	request(options, function (error, response, body) {
		if (error || response.statusCode != 200) {
			CreateSVG(res, label, 'repo not found');
			return;
		}

		var jsonBody = JSON.parse(body);

		// If they don't specify any queries, just return the status of the whole build
		if (isEmptyObject(queries)) {
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

			// Try to find the query combo specified
			for (var i = 0; i < jobs.length; i++) {
				var allCorrect = true

				var envVarList = jobs[i].config.env.split(' ')
				var envVars = new Object()
				for (var j = 0; j < envVarList.length; j++) {
					var splitList = envVarList[j].split('=')
					envVars[splitList[0].toLowerCase()] = splitList[1].toLowerCase()
				}

				Object.entries(queries).forEach(entry => {
					var key = entry[0].toLowerCase()
					var value = entry[1].toLowerCase()

					// os is a special flower
					// Travis CI API exposes it directly as a variable
					if (key == 'os') {
						allCorrect = allCorrect && jobs[i].config.os == value
						return
					}

					if (!(key in envVars)) {
						allCorrect = false
						return
					}

					if (value != envVars[key]) {
						allCorrect = false
					}
				})
				
				if (allCorrect) {
					jobIndex = i;
					break;
				}
			}

			if (jobIndex == -1) {
				CreateSVG(res, label, 'query combo not found');
				return;
			}


			var status = jobs[jobIndex].state;
			if (status == 'passed') {
				status = 'passing';
			} else if (status == 'failed') {
				status = 'failing'
			}
			CreateSVG(res, label, status);
		});
	});
}

function GenerateAppveyorSVGImage(res, username, repo, queries) {
	label = 'build'
	if (queries.label) {
		label = queries.label
		delete queries.label
	}

	branch = 'master'
	if (queries.branch) {
		branch = queries.branch
		delete queries.branch
	}

	// Look up the repo
	// Default to the master branch if not specified
	var options = {
		url: 'https://ci.appveyor.com/api/projects/' + username + '/' + repo + '/branch/' + branch,
        headers: {'Content-Type': 'application/json'}
	};

	console.info(options);

	request(options, function (error, response, body) {
		if (error || response.statusCode != 200) {
			CreateSVG(res, label, 'repo not found');
			return;
		}

		var jsonBody = JSON.parse(body);

		// If they don't specify any queries, just return the status of the whole build
		if (isEmptyObject(queries)) {
			var status = jsonBody.build.status;
			if (status == 'success') {
				status = 'passing';
			} else if (status == 'failed') {
				status = 'failing'
			}
			CreateSVG(res, label, status);
			return;
		}

		if(!jsonBody.hasOwnProperty('build')){
			CreateSVG(res, label, 'not found');
			return;
		}

		var jobIndex = -1;

		// Try to find the query combo specified
		for (var i = 0; i < jsonBody.build.jobs.length; i++) {
			var allCorrect = true

			var envVarList = jobs[i].config.env.split(' ')
			var envVars = new Object()
			for (var j = 0; j < envVarList.length; j++) {
				var splitList = envVarList[j].split('=')
				envVars[splitList[0].toLowerCase()] = splitList[1].toLowerCase()
			}

			Object.entries(queries).forEach(entry => {
				var key = entry[0].toLowerCase()
				var value = entry[1].toLowerCase()

				if (!jsonBody.build.jobs[i].hasOwnProperty(key)) {
					allCorrect = false;
				}
					
				if (jsonBody.build.jobs[i][key] == value) {
					allCorrect = false;
				}
			})
			
			if (allCorrect) {
				jobIndex = i;
				break;
			}
		}

		if (jobIndex == -1) {
			CreateSVG(res, label, 'query combo not found');
			return;
		}


		var status = jsonBody.build.jobs[jobIndex].status;
		if (status == 'success') {
			status = 'passing';
		} else if (status == 'failed') {
			status = 'failing'
		}
		CreateSVG(res, label, status);
	});
}

exports.GenerateTravisSVGImage = GenerateTravisSVGImage;
exports.GenerateAppveyorSVGImage = GenerateAppveyorSVGImage;
