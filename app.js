const fs = require('fs');
const Jimp = require('jimp');
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
            if (res.items) {
                res.items.forEach((item, i) => {
                    if (item.enclosure.type === "image/jpeg") {
                        let imgpath = process(item.enclosure.url, 1)
                        res.items[i].enclosure.url = imgpath
                    }
                })
            }
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

function process(url, dither_bits) {
    let filepath = "public" + url.split("/").pop();
    let filename = url.split("/").pop();
    if (fs.existsSync(filepath)) {
       return filename;
    }

    Jimp.read(url, (err, image) => {
        if (err) throw err;

        if (image.bitmap.height > 400) {
            image = image.resize(Jimp.AUTO, 400);
        }
        image = image.greyscale();

        dither_threshold = 2**dither_bits

        for (let hi = 0; hi < image.bitmap.height; ++hi) {
            let i = hi * image.bitmap.width * 4;
            for (let wj = 0; wj < image.bitmap.width; ++wj) {
                let j = wj * 4;
                let j_next = j + 4;
                let p = image.bitmap.data[i + j];
                var p_new = Math.round(p / 255 * (dither_threshold-1));
                p_new = Math.round(p_new * (255 / (dither_threshold-1)))
                
                image.bitmap.data[i + j]     = p_new;
                image.bitmap.data[i + j + 1] = p_new;
                image.bitmap.data[i + j + 2] = p_new;

                q_err = p - p_new;

                image.bitmap.data[i + j_next]     += q_err * (7 / 16);
                image.bitmap.data[i + j_next + 1] += q_err * (7 / 16);
                image.bitmap.data[i + j_next + 2] += q_err * (7 / 16);

                let i_next = (hi+1)*image.bitmap.width*4;
                
                if (hi === 215 && wj === 147) {
                }

                if (hi > 0) {
                    let j_prev = j - 4;
                    image.bitmap.data[i_next + j_prev] += q_err * (3 / 16);
                    image.bitmap.data[i_next + j_prev + 1] += q_err * (3 / 16);
                    image.bitmap.data[i_next + j_prev + 2] += q_err * (3 / 16);
                }

                image.bitmap.data[i_next + j] += q_err * (5 / 16);
                image.bitmap.data[i_next + j + 1] += q_err * (5 / 16);
                image.bitmap.data[i_next + j + 2] += q_err * (5 / 16);

                image.bitmap.data[i_next + j_next]     += q_err * (1 / 16);
                image.bitmap.data[i_next + j_next + 1] += q_err * (1 / 16);
                image.bitmap.data[i_next + j_next + 2] += q_err * (1 / 16);
            }
        }
        
        image.write(filepath);
    });
    return filename;
}