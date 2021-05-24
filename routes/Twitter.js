const express = require("express");
const Twit = require("twit");
const router = express.Router();
const axios = require("axios");
const CryptoJS = require("crypto-js");
const admin = require("firebase-admin");
const SERVER_API = require("../Config");

const db = admin.firestore();
var T = new Twit({
  consumer_key: "MYKEYS",
  consumer_secret: "MYKEYS",
  access_token: "MYKEYS",
  access_token_secret: "MYKEYS",
});


db.collection("Twitter").get().then((query)=>{
  let twitterIds = []
  query.forEach((doc)=>{
    twitterIds = [...twitterIds, doc.data().twitterId]
  })
  console.log(twitterIds)
  let stream = T.stream("statuses/filter", { follow: [twitterIds] });
          
          stream.on("tweet", (tweet) => {
            
            let screenName = tweet.user.screen_name.toLowerCase();
            let tweetId = tweet.id_str;
            let text = tweet.text;
            console.log( screenName  +" : "+ text)
            db.collection("Twitter")
              .doc(screenName)
              .get()
              .then((doc) => {
                if (doc.exists) {
                  let tokens = doc.data().Users.map((user) => {
                    return user;
                  });
                  console.log(tokens);
                  admin.messaging().sendMulticast({
                    tokens,
                    data: {
                      title: `${screenName} Published New Tweet!`,
                      body: `${text}`,
                      router:tweetId,
                      image: doc.data().twitterImage,
                      tag:"twitter",
                    },
                    android: {
                      priority: "high",
                    },
                    priority: "high",
                    show_in_foreground: true,
                    color: "#16e6b4",
                    sound: "default",
                  });
                }
              });
          });
          stream.on("connect", (message)=>{
            console.log(message.body)
          })
          stream.on("disconnect", (message)=>{
            console.log(message.body)
          })
})

router.post("/setStream", (req, res) => {
  let twitterName = req.body.twitterName.toLowerCase();

  T.get(
    "users/lookup",
    { screen_name: req.body.twitterName },
    (err, data, response) => {
      try {
        let twitterId = data[0].id_str;
        let userExists = db.collection("Users").doc(req.body.userId).get();
        userExists.then((docum) => {
          if (docum.exists) {
            if (!docum.data().Twitter.includes(req.body.twitterName)) {
              db.collection("Users")
                .doc(req.body.userId)
                .update({
                  Twitter: [...docum.data().Twitter, twitterName],
                });
            }
          } else {
            db.collection("Users")
              .doc(req.body.userId)
              .set({
                userId: req.body.userId,
                Twitter: [twitterName],
                channels: [],
                Youtube: [],
              });
          }
        });

        let isExists = db.collection("Twitter").doc(twitterName).get();
        isExists.then((doc) => {
          if (doc.exists) {
            if (!doc.data().Users.includes(req.body.userId)) {
              db.collection("Twitter")
                .doc(twitterName)
                .update({
                  Users: [...doc.data().Users, req.body.userId],
                });
              res.json({ success: true });
            } else {
              res.json({ success: false });
            }
          } else {
            let image = data[0].profile_image_url.split("_");
            let image_link = image[0] + "_" + image[1] + `_400x400.jpg`;
            db.collection("Twitter")
              .doc(twitterName)
              .set({
                twitterId: twitterId,
                twitterName: twitterName,
                twitterImage: image_link,
                Users: [req.body.userId],
              });
            let stream = T.stream("statuses/filter", { follow: [twitterId] });
            console.log("started");
            stream.on("tweet", (tweet) => {
              
              let name = tweet.user.name;
              let screenName = tweet.user.screen_name.toLowerCase();
              let tweetId = tweet.id_str;
              let text = tweet.text;
              console.log( screenName  +" : "+ text)
              db.collection("Twitter")
                .doc(screenName)
                .get()
                .then((doc) => {
                  if (doc.exists) {
                    let tokens = doc.data().Users.map((user) => {
                      return user;
                    });
                    console.log(tokens);
                    admin.messaging().sendMulticast({
                      tokens,
                      data: {
                        title: `${screenName} Published New Tweet!`,
                        body: `${text}`,
                        router:tweetId,
                        image: doc.data().twitterImage,
                        tag:"twitter",
                      },
                      android: {
                        priority: "high",
                      },
                      priority: "high",
                      show_in_foreground: true,
                      color: "#16e6b4",
                      sound: "default",
                    });
                  }
                });
            });
            res.json({ success: true });
          }
        });
      } catch (error) {
        if (err.statusCode == 404) {
          res.json({ success: false, message: "There is no user" });
        }
      }
    }
  );
});
router.get("/getTwitter/:twitterName", (req, res) => {
  let twitterName = req.params.twitterName;
  let twitterDetail = db.collection("Twitter").doc(twitterName).get();
  twitterDetail.then((doc) => {
    if (doc.exists) {
      res.json({
        twitterId: doc.data().twitterId,
        twitterName: doc.data().twitterName,
        twitterImage: doc.data().twitterImage,
      });
    } else {
      res.json({ success: false });
    }
  });
});
router.post("/deleteUser", (req, res) => {

      let check = db.collection("Users").doc(req.body.userId).get();
      check.then((doc) => {
        if (doc.exists) {
          let newData = doc
            .data()
            .Twitter.filter((flt) => flt !== req.body.twitterName);
          db.collection("Users")
            .doc(req.body.userId)
            .update({
              Twitter: [...newData],
            });
        }
      });
      let twit = db.collection("Twitter").doc(req.body.twitterName).get();

      twit.then((docum) => {
        if (docum.exists) {
          let newData = docum
            .data()
            .Users.filter((flt) => flt !== req.body.userId);
          console.log(newData);
          db.collection("Twitter")
            .doc(req.body.twitterName)
            .update({
              Users: [...newData],
            });
          res.json({ success: true });
        } else {
          console.log("error");
          res.json({ success: false });
        }
      });
  
});

module.exports = router;
