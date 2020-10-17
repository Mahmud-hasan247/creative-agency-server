const express = require('express');
require('dotenv').config()
const cors = require('cors');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const fileUpload = require('express-fileupload');
const MongoClient = require('mongodb').MongoClient;


const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('icons'));
app.use(fileUpload());




const serviceAccount = require("./configs/creative-agency-391a7-firebase-adminsdk-s96pq-1fe780acc2");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DB_URL
});



var uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0-shard-00-00.yetxo.mongodb.net:27017,cluster0-shard-00-01.yetxo.mongodb.net:27017,cluster0-shard-00-02.yetxo.mongodb.net:27017/${process.env.DB_NAME}?ssl=true&replicaSet=atlas-8altey-shard-0&authSource=admin&retryWrites=true&w=majority`;
MongoClient.connect(uri, { useUnifiedTopology: true }, function (err, client) {
    const services = client.db("CreativeAgencyInfo").collection("services");
    const admins = client.db("CreativeAgencyInfo").collection("admins");
    const reviews = client.db("CreativeAgencyInfo").collection("reviews");
    const orderedServices = client.db("CreativeAgencyInfo").collection("orderedServices");
    console.log('alhamdulillah');


    app.get('/services', (req, res) => {
        services.find()
            .toArray((err, documents) => {
                res.send(documents)
            })
    });

    app.get('/reviews', (req, res) => {
        reviews.find().limit(6)
            .toArray((err, documents) => {
                res.send(documents)
            })
    });

    app.get('/allOrders', (req, res) => {
        orderedServices.find()
            .toArray((err, documents) => {
                res.send(documents)
            })
    });

    app.get('/myOrderedServices/:email', (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];
            admin.auth().verifyIdToken(idToken)
                .then(decodedToken => {
                    const tokenEmail = decodedToken.email;
                    const paramEmail = req.params.email;
                    if (tokenEmail === paramEmail) {
                        orderedServices.find({ email: paramEmail })
                            .toArray((err, documents) => {
                                res.send(documents)
                            })
                    }
                    else {
                        res.status(401).send('Unauthorized access...!')
                    }
                })
                .catch(function (error) {
                    console.log(error)
                });
        }
        else {
            res.status(401).send('Unauthorized access...!')
        }
    });

    app.get('/orderNowFor/:title', (req, res) => {
        const title = req.params.title;
        console.log(title)
        services.find({ title: title })
            .toArray((err, documents) => {
                res.send(documents[0])
            })
    });

    app.post('/addService', (req, res) => {
        const file = req.files.file;
        const title = req.body.title;
        const description = req.body.description;
        const filePath = `${__dirname}/icons/${file.name}`;

        file.mv(filePath, err => {
            if (err) {
                console.log(err);
                res.status(500).send({ msg: 'Failed to upload image' });
            }
            const newImage = fs.readFileSync(filePath);
            const encodedImage = newImage.toString('base64');

            var image = {
                contentType: req.files.file.mimetype,
                size: req.files.file.size,
                img: Buffer(encodedImage, 'base64')
            };

            services.insertOne({ title, description, image })
                .then(result => {
                    fs.remove(filePath, error => {
                        if (error) {
                            console.log(error);
                            res.status(500).send({ msg: 'Failed to upload image' });
                        }
                        res.send(result.insertedCount > 0)
                    })
                })
        })
    });

    app.post('/makeAdmin', (req, res) => {
        const adminInfo = req.body;
        admins.insertOne(adminInfo)
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    });

    app.post('/postAReview', (req, res) => {
        const reviewInfo = req.body;
        reviews.insertOne(reviewInfo)
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    });

    app.post('/orderAService', (req, res) => {
        const orderServiceInfo = req.body;
        orderedServices.insertOne(orderServiceInfo)
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    });

    app.post('/admins', (req, res) => {
        const email = req.body.email;
        admins.find({email: email})
            .toArray((err, documents) => {
                res.send(documents.length > 0)
            })
    });

});


app.get('/', (req, res) => {
    res.send('assalamlu alaikum')
})

app.listen(process.env.PORT || 4000);