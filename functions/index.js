const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

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
    });
 });

 exports.createUniqueUser = functions.https.onRequest(async (req, res) => {
   try {
      const user = req.body;
      user.email = user.email.replace('\t', '');
      user.name = user.name.replace('\t', '');
      user.password = user.password.replace('\t', '');

      const result = await admin.firestore().collection('users').where('name', '==', `${user.name}`).get();
      console.log(result)
      if(result.docs.length == 0){
         const userCreated = await admin.auth().createUser({
            email: user.email,
            password: user.password,
            displayName: user.name,
         });
         delete user['password'];
         user.id = userCreated.uid;
         await admin.firestore().doc(`users/${userCreated.uid}`).create(user);
      }
      return res.status(200).json('Everything is allright');
   }
   catch(error) {
      console.log(error);
      return res.status(500).json('Something went wrong!');
   }
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