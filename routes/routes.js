var express = require('express');
var router = express.Router();
var GenerateSVGData = require('../generate_svg_data.js');

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});

router.get('/:username/:repo/', function(req, res, next) {
	var svgData = GenerateSVGData(req.params.username, req.params.repo, 'Build');

	if (svgData) {
		res.contentType('image/svg+xml');
		res.render('shield_template.svg.jade', svgData);
	}

	res.status(400).send('Error');
});

module.exports = router;
