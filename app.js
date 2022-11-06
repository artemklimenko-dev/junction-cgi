const express = require('express')
const app = express()
const port = 3000
const axios = require('axios')
const bodyParser = require('body-parser');
let Parser = require('rss-parser');
let parser = new Parser();
app.use(bodyParser.json()); //Handles JSON requests
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

let links = []

app.get('/rss', (req, resp) => {
    let lnks = combineRss(links)
    console.log(links)
    resp.json(lnks)
})

app.post('/rss', (req, resp) => {
    let urls = []
    if (req.body && req.body.urls) {
        urls = req.body.urls
    }
    urls.forEach(url => {
        let future = "";
        axios.get(url)
        .then(res => {
            future = res.data
            return parser.parseString(res.data)
        }).then(res => {
            links[url] = res
        })
        .catch(err => console.log(err))
    });
    resp.send("res")
})

app.post('/', (req, res) => {
    req.body;
    res.json(req.body);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

combineRss = (lnk) => {
    let vals = Object.values(lnk);
    let ls = vals[0]
    
    vals.forEach((link, i) => {
        console.log(i, link)
        if (i === 0) {
            return
        }
        ls.items.push(link.items)
    })
    return ls
}