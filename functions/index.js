const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//

 exports.onCreateMatch = functions.firestore.document('/matches/{matchId}').onCreate( dataComming => {
    let createdData = dataComming.data();
    let {players} = dataComming.data();
    players = recalculatePlayersPoints(players, createdData.winnerSide);
    players.forEach(player => {
      admin.firestore().doc(`users/${player.id}`).update(player);
      const point = {
         date: createdData.date,
         playerId: player.id,
         points: player.points
      }
      const parsedDate = new Date(createdData.date._seconds * 1000).toDateString();
      admin.firestore().doc(`points/${player.id}-${parsedDate}`).set(point);
      console.log(parsedDate)
    });
    console.log(createdData);
    console.log(createdData.date);
 });

 exports.createUniqueUser = functions.https.onRequest((req, res) => {
    const user = req.body;
    admin.firestore().doc(`users/${user.name}`).get().then(res => {
        console.log(res);
    });
    // 
  });


 const recalculatePlayersPoints = (players, winnerSide) => {
    if(winnerSide === 0) {
        players.players[0].points = players.players[0].points + players.expectedPoints;
        players.players[1].points = players.players[0].points + players.expectedPoints;
        players.players[2].points = players.players[2].points - players.expectedPoints;
        players.players[3].points = players.players[2].points - players.expectedPoints;
    }
    else {
        players.players[0].points = players.players[0].points - players.expectedPoints;
        players.players[1].points = players.players[0].points - players.expectedPoints;
        players.players[2].points = players.players[2].points + players.expectedPoints;
        players.players[3].points = players.players[2].points + players.expectedPoints;
    }
    return players;
 }