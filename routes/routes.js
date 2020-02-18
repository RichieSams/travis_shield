var express = require('express');
var router = express.Router();
var renderer = require('../generate_svg_image.js');

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});

router.get('/:api/:username/:repo', function(req, res, next) {
	if (req.params.api == 'travis') {
		console.info('travis');
		renderer.GenerateTravisSVGImage(res, req.params.username, req.params.repo, req.query ? req.query : new Object());
	} else if (req.params.api == 'appveyor') {
		console.log('appveyor');
		renderer.GenerateAppveyorSVGImage(res, req.params.username, req.params.repo, req.query ? req.query : new Object());
	} else {
		console.log.info('catch-all')
		res.status(200).end()
	}

	console.info('end');
});

module.exports = router;
