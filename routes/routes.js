var express = require('express');
var router = express.Router();
var GenerateSVGImage = require('../generate_svg_image.js');

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});

router.get('/:username/:repo', function(req, res, next) {
	GenerateSVGImage(res, req.params.username, req.params.repo, req.query ? req.query : new Object());
});

module.exports = router;
