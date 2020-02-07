const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.createMatch = functions.https.onRequest(async (req, res) => {
   const match = req.body;
   try {
      match.players = recalculatePlayersPoints(match.winners,
         match.losers);
         console.log(match.players);
      match.players.forEach(player => {
         admin.firestore().doc(`users/${player.id}`).update(player);
         const point = {
            date: new Date(match.date),
            playerName: player.name,
            points: player.points
         }
         const parsedDate = new Date(match.date).toDateString();
         admin.firestore().doc(`points/${player.name}-${parsedDate}`).set(point);
      });
      const matchParsed = parseMatch(match);
      admin.firestore().collection('matches').add(matchParsed);
      res.sendStatus(200);
   } catch (error) {
      console.log(error);
      res.status(500).json(error);
   }
});

exports.createUniqueUser = functions.https.onRequest(async (req, res) => {
   try {
      const user = req.body;
      const result = await admin.firestore().collection('users').where('name', '==', `${user.name}`).get();
      if(result.docs.length == 0) {
         await createUserAuthentication(user);
         await createOfficialUser(user);
         return res.status(200).json('Usuário criado com sucesso!');
      }
      return res.status(400).json('Nome de usuário já existente!');
   }
   catch(error) {
      console.log(error);
      return res.status(500);
   }
});

exports.getOverallStatistics = functions.https.onRequest(async (req, res) => {
   const today = new Date();
   const user = req.body;
   try{
      const pointsPerDayPromise = admin.firestore().collection('points').where('playerName', '==', `${user.name}`).orderBy('date').limit(30).get();
      const userMatches = (await admin.firestore().collection('matches').where('players', 'array-contains', `${user.name}`)
      .get()).docs.map(x => x.data());
      const wonMatches = userMatches.filter(x => x.winners.includes(user.name));
      const mostWinnerPartner = getMostWinnerPartner(wonMatches, user.name);
      const totalWonMatches = wonMatches.length;
      const totalWonMatchesThisMonth = wonMatches.filter(x => new Date(x.date._seconds * 1000).getMonth() == today.getMonth()).length;
      const totalPlayedMatches =  userMatches.length;
      const pointsPerDay = (await pointsPerDayPromise).docs.map(x => x.data());
      res.status(200).json({userMatches, mostWinnerPartner, pointsPerDay, totalWonMatches, totalWonMatchesThisMonth, totalPlayedMatches});
   }
   catch(e) {
      console.log(e);
      res.status(500).json(e);
   }
});

const createUserAuthentication = async (user) => {
   return await admin.auth().createUser({
      email: user.email,
      password: user.password,
      displayName: user.name,
   });
}

const createOfficialUser = async (user) => {
   delete user['password'];
   await admin.firestore().doc(`users/${user.name}`).create(user);
}

const recalculatePlayersPoints = (winners, losers) => {
   const pointsDifference = (winners[0].points + winners[1].points) - (losers[0].points + losers[1].points);
   console.log(Math.abs(pointsDifference));
   const expectedPoints = getExpectedPoints(Math.abs(pointsDifference));
   console.log(expectedPoints);
   let pointsToAdd= 0;
   if(winnersHasBiggerRating) {
      winners.forEach(w => { pointsToAdd = w.points + 10*(1-expectedPoints.sup); w.points = pointsToAdd});
      losers.forEach(l => { pointsToAdd = l.points + 10*(0-expectedPoints.inf); l.points = pointsToAdd});
   }
   else {
      winners.forEach(w => { pointsToAdd = w.points + 10*(1-expectedPoints.inf); w.points = pointsToAdd});
      losers.forEach(l => { pointsToAdd = l.points + 10*(0-expectedPoints.sup); l.points = pointsToAdd});
   }
   return [...winners, ...losers];
}

const getMostWinnerPartner = (wonMatches, username) => {
   const partnersList = wonMatches.map( x => x.winners.find( y => y !== username));
   let partnersCounter = {};
   let mostFrequent;
   let mostFrequentPartnerCounter = 0;
   partnersList.forEach(partner => {
      if(partnersCounter[partner] === undefined){
      partnersCounter[partner] = 1;
      }else{
         partnersCounter[partner] = partnersCounter[partner] + 1;
      }
      if(partnersCounter[partner] > mostFrequentPartnerCounter) {
         mostFrequentPartnerCounter = partnersCounter[partner];
         mostFrequent = partner;
      }
   })
   return mostFrequent;
}

const parseMatch = match => {
   delete match['losers'];
   match.players = match.players.map(p => p.name);
   match.winners = match.winners.map(w => w.name);
   match.date = new Date(match.date);
   return match;
}

const getExpectedPoints = (pointsDifference) => {
   if(pointsDifference < 3)  return {sup: 0.50, inf: 0.50};
   if(pointsDifference < 10) return {sup: 0.51, inf: 0.49};
   if(pointsDifference < 17) return {sup: 0.52, inf: 0.48};
   if(pointsDifference < 25) return {sup: 0.53, inf: 0.47};
   if(pointsDifference < 32) return {sup: 0.54, inf: 0.46};
   if(pointsDifference < 39) return {sup: 0.55, inf: 0.45};
   if(pointsDifference < 46) return {sup: 0.56, inf: 0.44};
   if(pointsDifference < 53) return {sup: 0.57, inf: 0.43};
   if(pointsDifference < 61) return {sup: 0.58, inf: 0.42};
   if(pointsDifference < 68) return {sup: 0.59, inf: 0.41};
   if(pointsDifference < 76) return {sup: 0.60, inf: 0.40};
   if(pointsDifference < 83) return {sup: 0.61, inf: 0.39};
   if(pointsDifference < 91) return {sup: 0.62, inf: 0.38};
   if(pointsDifference < 98) return {sup: 0.63, inf: 0.37};
   if(pointsDifference < 106) return {sup: 0.64, inf: 0.36};
   if(pointsDifference < 113) return {sup: 0.65, inf: 0.35};
   if(pointsDifference < 115) return {sup: 0.66, inf: 0.34};
   if(pointsDifference < 129) return {sup: 0.67, inf: 0.33};
   if(pointsDifference < 137) return {sup: 0.68, inf: 0.32};
   if(pointsDifference < 145) return {sup: 0.69, inf: 0.31};
   if(pointsDifference < 153) return {sup: 0.70, inf: 0.30};
   if(pointsDifference < 162) return {sup: 0.71, inf: 0.29};
   if(pointsDifference < 170) return {sup: 0.72, inf: 0.28};
   if(pointsDifference < 179) return {sup: 0.73, inf: 0.27};
   if(pointsDifference < 189) return {sup: 0.74, inf: 0.26};
   if(pointsDifference < 197) return {sup: 0.75, inf: 0.25};
   if(pointsDifference < 206) return {sup: 0.76, inf: 0.24};
   if(pointsDifference < 215) return {sup: 0.77, inf: 0.23};
   if(pointsDifference < 225) return {sup: 0.78, inf: 0.22};
   if(pointsDifference < 235) return {sup: 0.79, inf: 0.21};
   if(pointsDifference < 245) return {sup: 0.80, inf: 0.20};
   if(pointsDifference < 256) return {sup: 0.81, inf: 0.19};
   if(pointsDifference < 267) return {sup: 0.82, inf: 0.18};
   if(pointsDifference < 278) return {sup: 0.83, inf: 0.17};
   if(pointsDifference < 290) return {sup: 0.84, inf: 0.16};
   if(pointsDifference < 302) return {sup: 0.85, inf: 0.15};
   if(pointsDifference < 315) return {sup: 0.86, inf: 0.14};
   if(pointsDifference < 328) return {sup: 0.87, inf: 0.13};
   if(pointsDifference < 344) return {sup: 0.88, inf: 0.12};
   if(pointsDifference < 357) return {sup: 0.89, inf: 0.11};
   if(pointsDifference < 374) return {sup: 0.90, inf: 0.10};
   if(pointsDifference < 391) return {sup: 0.91, inf: 0.09};
   if(pointsDifference < 411) return {sup: 0.92, inf: 0.08};
   if(pointsDifference < 432) return {sup: 0.93, inf: 0.07};
   if(pointsDifference < 456) return {sup: 0.94, inf: 0.06};
   if(pointsDifference < 484) return {sup: 0.95, inf: 0.05};
   if(pointsDifference < 517) return {sup: 0.96, inf: 0.04};
   if(pointsDifference < 559) return {sup: 0.97, inf: 0.03};
   if(pointsDifference < 619) return {sup: 0.98, inf: 0.02};
   if(pointsDifference < 735) return {sup: 0.99, inf: 0.01};
   return {sup: 1, inf: 0};
}

const winnersHasBiggerRating = (pointsDifference) => pointsDifference > 0;