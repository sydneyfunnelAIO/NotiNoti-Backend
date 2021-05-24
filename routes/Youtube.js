const express = require("express");
const Twit = require("twit");
const router = express.Router();
const axios = require("axios");
const CryptoJS = require("crypto-js");
const admin = require("firebase-admin");
const SERVER_API = require("../Config");
const { YOUTUBE } = require("../Config");
const { YouTube } = require("popyt");
const parseString = require("xml2js").parseString;
const youtube = new YouTube("YOUTUBETOKEN");

const pubsubhubbub = require("pubsubhubbub");
const client = pubsubhubbub.createServer({
  callbackUrl: `${YOUTUBE}/pubsubhubbub`,
  leaseSeconds: 90000
});
router.use("/pubsubhubbub", client.listener());

const db = admin.firestore();

router.get("/refreshYoutube", (req,res)=>{
  db.collection("Youtube").get().then((query)=>{
    query.forEach((doc)=> {
      console.log(doc.data().channelTitle)
      let topic =
            "https://www.youtube.com/xml/feeds/videos.xml?channel_id=" + doc.data().channelId;
          client.subscribe(
            topic,
            "http://pubsubhubbub.appspot.com/",
            (err, a) => {
              if (err) {
                console.log(err);
              } else {
                
              }
            }
          );
      
    } )
  })
  res.json({success:true,status:200})
})

router.post("/registerYoutube", async(req, res) => {
  let userId = req.body.userId;
  let channelName = req.body.channelName;
try {
  let channel = await youtube.getChannel(channelName).catch((e)=>{
    console.log(e);
  });
  console.log(channel);
  let id = channel.data.id;
  let channelTitle = channel.data.snippet.title;
  let channelPicture = channel.profilePictures.high.url;

  let user = db.collection("Users").doc(userId).get();
  user.then((doc) => {
    if (doc.exists) {
      if (doc.data().Youtube.includes(id)) {
        res.json({ success: false }).status(400);
      } else {
        db.collection("Users")
          .doc(userId)
          .update({
            Youtube: [...doc.data().Youtube, id],
          });
      }
    } else {
      db.collection("Users")
        .doc(userId)
        .set({
          userId: userId,
          Youtube: [id],
          channels: [],
          Twitter: [],
        });
    }
  });
  let You = db.collection("Youtube").doc(id).get();
  You.then((doc) => {
    if (doc.exists) {
      if(doc.data().Users.includes(userId)){
      }
      else{
        db.collection("Youtube")
        .doc(id)
        .update({
          Users: [...doc.data().Users, userId],
        })
        .then(() => {
          res.json({ success: true });
        });
      }
     
    } else {
      db.collection("Youtube")
        .doc(id)
        .set({
         
          channelTitle: channelTitle,
          channelId: id,
          channelPicture: channelPicture,
          Users: [userId],
          reachedMessages:[],
        })
        .then(() => {
          let topic =
            "https://www.youtube.com/xml/feeds/videos.xml?channel_id=" + id;
          client.subscribe(
            topic,
            "http://pubsubhubbub.appspot.com/",
            (err, a) => {
              if (err) {
                console.log(err);
              } else {
                console.log(a);
                res.json({ success: true });
              }
            }
          );
        });
    }
  });
} catch (error) {
  console.log(error)
  res.json({error:error , success:false});
}

});


client.on("unsubscribe", (data) => {
  console.log("Unsubscribe");
  console.log(data.topic);
});
client.on("error", error =>{
  console.log(error)
})
client.on("denied", denied =>{
  console.log(denied)

})


client.on("feed", (data) => {
  try {
    parseString(data.feed.toString(), (err, result) => {
      let entry = result.feed.entry[0];
      let videoId = entry["yt:videoId"][0];
      let channelId = entry["yt:channelId"][0];
      let channelName = entry.author[0].name;
      let title = entry.title[0];
      console.log(entry);//TODO: SEND NOTIFICATION
      let yt =  db.collection("Youtube").doc(channelId).get();
       yt.then((doc)=>{
         if(doc.exists){
           
          if(!doc.data().reachedMessages.includes(videoId)){
            //TODO:SEND NOTIFICATION
            let tokens = doc.data().Users.map((user)=>{
              return user;
            })
            admin.messaging().sendMulticast({
              tokens,
              data:{
                title:`${channelName} Published New Video!`,
                body: `${title}`,
                router: videoId,
                image: doc.data().channelPicture,
                tag:"youtube",
              },
              android:{
                priority:"high"
              },
              priority:"high",
              show_in_foreground:true,
              color:"#16e6b4",
              sound:"default",
            })
            db.collection("Youtube").doc(channelId).update({
              reachedMessages:[...doc.data().reachedMessages,videoId]
            })
          }
         }
       }) 
  
  
    });
  } catch (error) {
    console.log(error)
  }
 
});
router.get("/getYoutube/:youtubeId", (req, res) => {
  let youtubeId = req.params.youtubeId;
  let YoutubeDetail = db.collection("Youtube").doc(youtubeId).get();
  YoutubeDetail.then((doc) => {
    if (doc.exists) {
      res.json({
        channelId: doc.data().channelId,
        channelPicture: doc.data().channelPicture,
        channelTitle:doc.data().channelTitle
      });
    } else {
      res.json({ success: false });
    }
  });
});
router.post("/deleteUser", (req, res) => {
  let youtubeId = req.body.youtubeId;
  let userId = req.body.userId;
  console.log(youtubeId)

  let check = db.collection("Users").doc(userId).get();
  check.then((doc) => {
    if (doc.exists) {
      let newData = doc
        .data()
        .Youtube.filter((flt) => flt !== youtubeId);
      db.collection("Users")
        .doc(userId)
        .update({
          Youtube: [...newData],
        });
    }
  });
  let yout = db.collection("Youtube").doc(youtubeId).get();

  yout.then((docum) => {
    if (docum.exists) {
      let newData = docum.data().Users.filter((flt) => flt !== userId);
      db.collection("Youtube")
        .doc(youtubeId)
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
