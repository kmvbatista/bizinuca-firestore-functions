const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.onCreateMatch = functions.firestore.document('/matches/{matchId}').onCreate( dataComming => {
   const createdData = dataComming.data();
   let { players } = dataComming.data();
   try {
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
   } catch (error) {
      console.log(error);
   }
});

exports.createUniqueUser = functions.https.onRequest(async (req, res) => {
   try {
      const user = req.body;
      const result = await admin.firestore().collection('users').where('name', '==', `${user.name}`).get();
      if(result.docs.length == 0){
         const userCreated = await createUserAuthentication(user);
         const response = await createOfficialUser(user, userCreated.uid);
         return res.status(200).json('Usuário criado com sucesso!');
      }
      else {
         return res.status(400).json('Nome de usuário já existente!');
      }
   }
   catch(error) {
      console.log(error);
      return res.status(500);
   }
});

exports.getOverallStatistics = functions.https.onRequest(async (req, res) => {
   const today = new Date();
   const user = req.body;
   console.log(user)
   try{
      const userMatches = (admin.firestore().collection('matches').where('players', 'array-contains', `${user.name}`)
      .get()).docs.map(x => x.data());
      const pointsPerDay = (await admin.firestore().collection('points').where('playerId', '==', `${user.id}`).get()).docs.map(x => x.data());
      const wonMatches = userMatches.filter(x => x.winners.includes(user.name));
      const totalWonMatches = wonMatches.length;
      const totalWonMatchesThisMonth = wonMatches.filter(x => new Date(x.date._seconds * 1000).getMonth() == today.getMonth()).length;
      const totalPlayedMatches =  userMatches.length;
      res.status(200).json({userMatches, pointsPerDay, totalWonMatches, totalWonMatchesThisMonth, totalPlayedMatches});
   }
   catch(e) {
      console.log(e);
      res.status(500).json(e);
   }
});

const createUserAuthentication = async (user) => {
   await admin.auth().createUser({
      email: user.email,
      password: user.password,
      displayName: user.name,
   });
}

const createOfficialUser = async (user, createdUserId) => {
   delete user['password'];
   user.id = createdUserId;
   await admin.firestore().doc(`users/${createdUserId}`).create(user);
}

const recalculatePlayersPoints = (players, winnerSide) => {
   if(isLeftSideWinner(winnerSide)) {
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

const isLeftSideWinner = (winnerSide) => winnerSide == 0 ? true : false;