const express = require('express');
const router = express.Router();
const jwtMiddleware = require('../auth/authMiddleware');
const axios = require('axios');

// middleware that is specific to this router
router.use((req, res, next) => {
    console.log('Time: ', Date.now())
    next()
})
// define the home page route
router.get('/', (req, res) => {
    res.send('Nominatim home page')
})

router.use('/:path(*)', jwtMiddleware, (req, res) => {
    //the string path above could lierally be any string
    // console.log(req.originalUrl);
    // console.log(req.params.path);
    let resource = req.params.path;
    let params = req.query
    const url = `${process.env.NOMINATIM_SERVER_URL}/${resource}?${new URLSearchParams(params)}`;
    console.log(`url: ${url}`)
    axios.get(url)
        .then(response => {
            res.send(response.data);
        })
        .catch(error => {
            console.log(error);
            res.status(500).send('Internal server error');
        });

});


module.exports = router;
